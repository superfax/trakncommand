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

    // Map back to camelCase (check both snake and camel from DB)
    return (data || []).map((row: any) => ({
        id: row.id,
        handle: row.handle,
        name: row.name,
        profilePic: row.profile_pic || row.profilePic,
        status: row.status,
        timestamp: row.timestamp,
        tags: row.tags
    })) as Lead[];
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

    // Case-Resilient: Send both to satisfy any schema
    const dbLead: any = {
        id: enriched.id,
        handle: enriched.handle,
        name: enriched.name,
        profile_pic: enriched.profilePic,
        profilePic: enriched.profilePic, // Support camelCase
        status: enriched.status,
        timestamp: enriched.timestamp,
        tags: enriched.tags
    };

    const { error } = await client
        .from('leads')
        .upsert(dbLead, { onConflict: 'id' });

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

    return !!data && !error;
}

export async function deleteLead(id: string): Promise<void> {
    const client = await getSafeClient();
    const { error } = await client
        .from('leads')
        .delete()
        .eq('id', id);

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

export async function getActivities(): Promise<ActivityItem[]> {
    const client = await getSafeClient();
    const { data, error } = await client
        .from('activity')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

    if (error) {
        console.error("[Supabase] Error fetching activity:", error);
        return [];
    }

    // Map back to camelCase (check both)
    return (data || []).map((row: any) => ({
        id: row.id,
        handle: row.handle,
        comment: row.comment,
        status: row.status,
        timestamp: row.timestamp,
        replyText: row.reply_text || row.replyText,
        postImage: row.post_image || row.postImage,
        postCaption: row.post_caption || row.postCaption,
        commentId: row.comment_id || row.commentId,
        userId: row.user_id || row.userId
    })) as ActivityItem[];
}

export async function logActivity(item: ActivityItem): Promise<void> {
    const client = await getSafeClient();

    // Case-Resilient: Send both snake_case and camelCase
    const dbItem: any = {
        id: item.id,
        handle: item.handle,
        comment: item.comment,
        status: item.status,
        timestamp: item.timestamp,
        reply_text: item.replyText,
        replyText: item.replyText,
        post_image: item.postImage,
        postImage: item.postImage,
        post_caption: item.postCaption,
        postCaption: item.postCaption,
        comment_id: item.commentId,
        commentId: item.commentId,
        user_id: item.userId,
        userId: item.userId
    };

    const { error } = await client
        .from('activity')
        .upsert(dbItem, { onConflict: 'id' });

    if (error) {
        // If it still fails, it's likely a missing column. We log it but proceed to avoid blocking the bot.
        console.error("[Supabase] Error logging activity:", error);
    }
}

export async function updateActivityStatus(
    commentId: string,
    status: "sent" | "failed",
    replyText?: string
): Promise<void> {
    const client = await getSafeClient();

    // Try to find by both column styles
    const { data: itemsBySnake } = await client.from('activity').select('id').eq('comment_id', commentId).eq('status', 'pending');
    const { data: itemsByCamel } = await client.from('activity').select('id').eq('commentId', commentId).eq('status', 'pending');

    const items = [...(itemsBySnake || []), ...(itemsByCamel || [])];
    if (items.length === 0) return;

    const item = items[0];
    const updatePayload: any = { status, reply_text: replyText, replyText: replyText };

    const { error: updateError } = await client
        .from('activity')
        .update(updatePayload)
        .eq('id', item.id);

    if (updateError) {
        console.error("[Supabase] Error updating activity status:", updateError);
    }
}
