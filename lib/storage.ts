import { Lead } from "@/components/MiniCRM";
import { ActivityItem } from "@/components/LiveActivityFeed";

// CAUTION: This function is strictly runtime-only. 
// It will return a mock if called during build or if keys are invalid.
async function getSafeClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check for "falsy" or "placeholder" or "undefined" strings
    const isValid = (val?: string) => val && val !== "" && val !== "undefined" && val !== "null" && val.length > 10;

    if (!isValid(url) || !isValid(key)) {
        console.warn("[Storage] Missing or invalid Supabase keys. Using build-safe mock.");
        return {
            from: () => ({
                select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
                upsert: () => Promise.resolve({ error: null }),
                delete: () => ({ eq: () => ({ neq: () => Promise.resolve({ error: null }) }) }),
                update: () => ({ eq: () => Promise.resolve({ error: null }) }),
                single: () => Promise.resolve({ data: null, error: null })
            })
        } as any;
    }

    try {
        const { createClient } = await import('@supabase/supabase-js');
        return createClient(url!, key!);
    } catch (e) {
        console.error("[Storage] Failed to initialize Supabase client:", e);
        return { from: () => ({ select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) } as any;
    }
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
