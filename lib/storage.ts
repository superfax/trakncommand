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

    // Map back: Prefer camelCase as it seems to be the user's schema standard
    return (data || []).map((row: any) => ({
        id: row.id,
        handle: row.handle,
        name: row.name,
        profilePic: row.profilePic || row.profile_pic,
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
                `https://graph.facebook.com/v24.0/${lead.id}?fields=name,profile_pic,username&access_token=${token}`
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

    // FIXED: Only send camelCase to avoid PGRST204 (Column not found)
    const dbLead: any = {
        id: enriched.id,
        handle: enriched.handle,
        name: enriched.name,
        profilePic: enriched.profilePic,
        status: enriched.status,
        timestamp: enriched.timestamp,
        tags: enriched.tags
    };

    const { error } = await client
        .from('leads')
        .upsert(dbLead, { onConflict: 'id' });

    if (error) {
        // Fallback: If camelCase fails, try snake_case once (for legacy safety)
        if (error.code === 'PGRST204') {
            const legacyLead = { ...dbLead, profile_pic: enriched.profilePic };
            delete legacyLead.profilePic;
            await client.from('leads').upsert(legacyLead, { onConflict: 'id' });
        } else {
            console.error("[Supabase] Error saving lead:", error);
        }
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

    return (data || []).map((row: any) => ({
        id: row.id,
        handle: row.handle,
        comment: row.comment,
        status: row.status,
        timestamp: row.timestamp,
        replyText: row.replyText || row.reply_text,
        postImage: row.postImage || row.post_image,
        postCaption: row.postCaption || row.post_caption,
        commentId: row.commentId || row.comment_id,
        userId: row.userId || row.user_id
    })) as ActivityItem[];
}

export async function logActivity(item: ActivityItem): Promise<void> {
    try {
        const client = await getSafeClient();

        // FIXED: Only send camelCase to avoid PGRST204
        const dbItem: any = {
            id: item.id,
            handle: item.handle,
            comment: item.comment,
            status: item.status,
            timestamp: item.timestamp,
            replyText: item.replyText,
            postImage: item.postImage,
            postCaption: item.postCaption,
            commentId: item.commentId,
            userId: item.userId
        };

        const { error } = await client
            .from('activity')
            .upsert(dbItem, { onConflict: 'id' });

        if (error) {
            // Fallback: Try snake_case if camelCase fails with PGRST204
            if (error.code === 'PGRST204') {
                const snakeItem: any = {
                    id: item.id,
                    handle: item.handle,
                    comment: item.comment,
                    status: item.status,
                    timestamp: item.timestamp,
                    reply_text: item.replyText,
                    post_image: item.postImage,
                    post_caption: item.postCaption,
                    comment_id: item.commentId,
                    user_id: item.userId
                };
                await client.from('activity').upsert(snakeItem, { onConflict: 'id' });
            } else {
                console.error("[Supabase] Error logging activity:", error);
            }
        }
    } catch (e) {
        console.error("[Storage] Fatal error in logActivity:", e);
    }
}

export async function updateActivityStatus(
    commentId: string,
    status: "sent" | "failed" | "partial",
    replyText?: string
): Promise<void> {
    try {
        const client = await getSafeClient();

        // Try camelCase first (likely correct per error logs)
        let { data: items } = await client.from('activity').select('id').eq('commentId', commentId).eq('status', 'pending');

        // Fallback to snake_case only if no items found
        if (!items || items.length === 0) {
            const { data: snakeItems } = await client.from('activity').select('id').eq('comment_id', commentId).eq('status', 'pending');
            items = snakeItems;
        }

        if (!items || items.length === 0) return;

        const item = items[0];
        const { error } = await client
            .from('activity')
            .update({ status, replyText: replyText })
            .eq('id', item.id);

        if (error && error.code === 'PGRST204') {
            // Last resort update via snake_case
            await client.from('activity').update({ status, reply_text: replyText }).eq('id', item.id);
        }
    } catch (e) {
        console.error("[Storage] Fatal error in updateActivityStatus:", e);
    }
}
