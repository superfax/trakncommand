import { Lead } from "@/components/MiniCRM";
import { ActivityItem } from "@/components/LiveActivityFeed";
import { getSupabaseClient } from "./supabase";

async function getSafeClient() {
    return getSupabaseClient();
}

// --- LEADS ---

export async function getLeads(): Promise<Lead[]> {
    const client = await getSafeClient();
    const { data, error } = await client
        .from('leads')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error("[Supabase] Error fetching leads:", error);
        return [];
    }
    return data as Lead[];
}

export async function saveLead(lead: Lead): Promise<void> {
    const enriched = { ...lead };
    try {
        const token = process.env.FB_ACCESS_TOKEN;
        const isNumericId = /^\d+$/.test(lead.id);

        if (token && lead.id && isNumericId) {
            const res = await fetch(
                `https://graph.facebook.com/v19.0/${lead.id}?fields=name,profile_pic,username&access_token=${token}`
            );
            const data = await res.json();
            if (!data.error) {
                if (data.profile_pic) enriched.profilePic = data.profile_pic;
                if (data.name) enriched.name = data.name;
            }
        }
    } catch (e) {
        console.warn("[Storage] Could not enrich lead profile:", e);
    }

    const client = await getSafeClient();
    const { error } = await client
        .from('leads')
        .upsert(enriched, { onConflict: 'id' });

    if (error) {
        console.error("[Supabase] Error saving lead:", error);
    }
}

export async function hasContactedUser(userId: string): Promise<boolean> {
    const client = await getSafeClient();
    const { data, error } = await client
        .from('leads')
        .select('id')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("[Supabase] Error checking contacted user:", error);
    }
    return !!data;
}

export async function deleteLead(leadId: string): Promise<void> {
    const client = await getSafeClient();
    const { error } = await client
        .from('leads')
        .delete()
        .eq('id', leadId);

    if (error) {
        console.error("[Supabase] Error deleting lead:", error);
    }
}

export async function purgeLeads(): Promise<void> {
    const client = await getSafeClient();
    const { error } = await client
        .from('leads')
        .delete()
        .neq('id', '0');

    if (error) {
        console.error("[Supabase] Error purging leads:", error);
    }
}

// --- ACTIVITY LOGS ---

export async function getActivity(): Promise<ActivityItem[]> {
    const client = await getSafeClient();
    const { data, error } = await client
        .from('activity')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

    if (error) {
        console.error("[Supabase] Error fetching activity:", error);
        return [];
    }
    return data as ActivityItem[];
}

export async function logActivity(item: ActivityItem): Promise<void> {
    const client = await getSafeClient();
    const { error } = await client
        .from('activity')
        .upsert(item, { onConflict: 'id' });

    if (error) {
        console.error("[Supabase] Error logging activity:", error);
    }
}

export async function updateActivityStatus(
    commentId: string,
    status: "sent" | "failed",
    replyText?: string
): Promise<void> {
    const client = await getSafeClient();
    const { data: items, error: fetchError } = await client
        .from('activity')
        .select('*')
        .eq('commentId', commentId)
        .eq('status', 'pending');

    if (fetchError || !items || items.length === 0) return;

    const item = items[0];
    const { error: updateError } = await client
        .from('activity')
        .update({ status, replyText })
        .eq('id', item.id);

    if (updateError) {
        console.error("[Supabase] Error updating activity status:", updateError);
    }
}
