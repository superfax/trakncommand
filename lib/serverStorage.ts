// Server-side storage for API routes that run without a user session (webhooks, simulate, reply).
// Uses service role key + TRAKN_OWNER_ID env var to identify which account to write to.
import { Lead } from "@/components/MiniCRM";
import { ActivityItem } from "@/components/LiveActivityFeed";
import { createServiceClient } from "@/utils/supabase/service";
import { Settings } from "./settings";

const DEFAULT_SETTINGS: Settings = {
    keyword: "PRO",
    isSystemOnline: true,
    autoReply: "Check Dm for Your Access. :)",
    dmReply: "Here is your exclusive access! 🚀 Click here: https://trakn.pro/access",
    followUpDm: "",
    cooldownHours: 24,
    keywordMode: "single",
    keywordRules: [],
    macros: [
        { label: "⚡ Pricing", text: "Hey! Our plans start at $29/mo. Check trakn.pro/pricing 🚀" },
        { label: "📞 Call", text: "Let's chat! Book a demo here: trakn.pro/demo 📅" },
        { label: "👋 Welcome", text: "Welcome to the crew! Any questions? 👊" }
    ]
};

function getOwnerId(): string {
    const id = process.env.TRAKN_OWNER_ID;
    if (!id) throw new Error('[serverStorage] Missing TRAKN_OWNER_ID env var');
    return id;
}

// --- SETTINGS ---

export async function getServerSettings(): Promise<Settings> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

    const { data, error } = await client
        .from('settings')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

    if (error || !data) {
        console.warn('[serverStorage] No settings found for owner, using defaults');
        return DEFAULT_SETTINGS;
    }

    return {
        keyword: data.keyword || DEFAULT_SETTINGS.keyword,
        isSystemOnline: typeof data.isSystemOnline === 'boolean' ? data.isSystemOnline : DEFAULT_SETTINGS.isSystemOnline,
        autoReply: data.autoReply || data.auto_reply || DEFAULT_SETTINGS.autoReply,
        dmReply: data.dmReply || data.dm_reply || DEFAULT_SETTINGS.dmReply,
        followUpDm: data.followUpDm || data.follow_up_dm || DEFAULT_SETTINGS.followUpDm,
        cooldownHours: typeof data.cooldownHours === 'number' ? data.cooldownHours : DEFAULT_SETTINGS.cooldownHours,
        keywordMode: data.keywordMode || data.keyword_mode || DEFAULT_SETTINGS.keywordMode,
        keywordRules: Array.isArray(data.keywordRules) ? data.keywordRules : DEFAULT_SETTINGS.keywordRules,
        macros: Array.isArray(data.macros) ? data.macros : DEFAULT_SETTINGS.macros,
    };
}

export async function serverSaveSettings(settings: Partial<Settings>): Promise<void> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

    const dbUpdate: any = { owner_id: ownerId };
    if (settings.keyword !== undefined) dbUpdate.keyword = settings.keyword;
    if (settings.isSystemOnline !== undefined) dbUpdate.isSystemOnline = settings.isSystemOnline;
    if (settings.autoReply !== undefined) dbUpdate.autoReply = settings.autoReply;
    if (settings.dmReply !== undefined) dbUpdate.dmReply = settings.dmReply;
    if (settings.followUpDm !== undefined) dbUpdate.followUpDm = settings.followUpDm;
    if (settings.cooldownHours !== undefined) dbUpdate.cooldownHours = settings.cooldownHours;
    if (settings.keywordMode !== undefined) dbUpdate.keywordMode = settings.keywordMode;
    if (settings.keywordRules !== undefined) dbUpdate.keywordRules = settings.keywordRules;
    if (settings.macros !== undefined) dbUpdate.macros = settings.macros;

    const { error } = await client
        .from('settings')
        .upsert(dbUpdate, { onConflict: 'owner_id' });

    if (error) console.error('[serverStorage] Error saving settings:', error);
}

// --- LEADS ---

export async function serverSaveLead(lead: Lead): Promise<void> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

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
        console.warn('[serverStorage] Could not enrich lead:', e);
    }

    const newTags = (enriched.tags || []).filter((t: string) => !t.startsWith("NOTE::::"));
    if (enriched.notes) newTags.push(`NOTE::::${enriched.notes}`);

    const { error } = await client.from('leads').upsert({
        id: enriched.id,
        owner_id: ownerId,
        handle: enriched.handle,
        name: enriched.name,
        profilePic: enriched.profilePic,
        status: enriched.status,
        timestamp: enriched.timestamp,
        tags: newTags,
    }, { onConflict: 'id' });

    if (error) console.error('[serverStorage] Error saving lead:', error);
}

export async function serverHasContactedUser(userId: string, cooldownHours: number = 24): Promise<{ contacted: boolean; isInCooldown: boolean }> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

    const { data, error } = await client
        .from('leads')
        .select('id, timestamp')
        .eq('id', userId)
        .eq('owner_id', ownerId)
        .single();

    if (error || !data) return { contacted: false, isInCooldown: false };
    if (cooldownHours === 0) return { contacted: true, isInCooldown: false };

    const hoursSince = (Date.now() - new Date(data.timestamp).getTime()) / (1000 * 60 * 60);
    return { contacted: true, isInCooldown: hoursSince < cooldownHours };
}

export async function serverUpdateLeadStatus(id: string, status: string): Promise<void> {
    const client = createServiceClient();
    const { error } = await client.from('leads').update({ status }).eq('id', id);
    if (error) console.error('[serverStorage] Error updating lead status:', error);
}

// --- ACTIVITY ---

export async function serverLogActivity(item: ActivityItem): Promise<void> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

    const { error } = await client.from('activity').upsert({
        id: item.id,
        owner_id: ownerId,
        handle: item.handle,
        comment: item.comment,
        status: item.status,
        timestamp: item.timestamp,
        replyText: item.replyText,
        postImage: item.postImage,
        postCaption: item.postCaption,
        commentId: item.commentId,
        userId: item.userId,
    }, { onConflict: 'id' });

    if (error) console.error('[serverStorage] Error logging activity:', error);
}

export async function serverGetActivities(): Promise<ActivityItem[]> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

    const { data, error } = await client
        .from('activity')
        .select('*')
        .eq('owner_id', ownerId)
        .order('timestamp', { ascending: false })
        .limit(50);

    if (error) return [];
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
        userId: row.userId || row.user_id,
    })) as ActivityItem[];
}

export async function serverUpdateActivityStatus(
    commentId: string,
    status: "sent" | "failed" | "partial",
    replyText?: string
): Promise<void> {
    const client = createServiceClient();
    const ownerId = getOwnerId();

    let { data: items } = await client.from('activity').select('id').eq('commentId', commentId).eq('owner_id', ownerId).eq('status', 'pending');
    if (!items || items.length === 0) {
        const { data: snakeItems } = await client.from('activity').select('id').eq('comment_id', commentId).eq('owner_id', ownerId).eq('status', 'pending');
        items = snakeItems;
    }
    if (!items || items.length === 0) return;

    await client.from('activity').update({ status, replyText }).eq('id', items[0].id);
}
