import { supabase } from "./supabase";
import { Lead } from "@/components/MiniCRM";
import { ActivityItem } from "@/components/LiveActivityFeed";

// --- LEADS ---

export async function getLeads(): Promise<Lead[]> {
    const { data, error } = await supabase
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
    // Enrich with Instagram profile photo + display name
    const enriched = { ...lead };
    try {
        const token = process.env.FB_ACCESS_TOKEN;
        const isNumericId = /^\d+$/.test(lead.id); // Real IGSIDs are purely numeric

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

    const { error } = await supabase
        .from('leads')
        .upsert(enriched, { onConflict: 'id' });

    if (error) {
        console.error("[Supabase] Error saving lead:", error);
    }
}

export async function hasContactedUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('leads')
        .select('id')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows'
        console.error("[Supabase] Error checking contacted user:", error);
    }
    return !!data;
}

export async function deleteLead(leadId: string): Promise<void> {
    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

    if (error) {
        console.error("[Supabase] Error deleting lead:", error);
    }
}

export async function purgeLeads(): Promise<void> {
    const { error } = await supabase
        .from('leads')
        .delete()
        .neq('id', '0'); // Hack to delete all if primary key is string

    if (error) {
        console.error("[Supabase] Error purging leads:", error);
    }
}

// --- ACTIVITY LOGS ---

export async function getActivity(): Promise<ActivityItem[]> {
    const { data, error } = await supabase
        .from('activity')
        .select('*')
        .order('id', { ascending: false }) // rx-timestamp based ID or just created_at
        .limit(50);

    if (error) {
        console.error("[Supabase] Error fetching activity:", error);
        return [];
    }
    return data as ActivityItem[];
}

export async function logActivity(item: ActivityItem): Promise<void> {
    const { error } = await supabase
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
    const { data: items, error: fetchError } = await supabase
        .from('activity')
        .select('*')
        .eq('commentId', commentId)
        .eq('status', 'pending');

    if (fetchError || !items || items.length === 0) return;

    const item = items[0];
    const { error: updateError } = await supabase
        .from('activity')
        .update({ status, replyText })
        .eq('id', item.id);

    if (updateError) {
        console.error("[Supabase] Error updating activity status:", updateError);
    }
}
