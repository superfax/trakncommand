import { createClient } from "@/utils/supabase/server";

export interface Macro {
    label: string;
    text: string;
}

export interface KeywordRule {
    keyword: string;
    dmReply: string;
    autoReply: string;
    followUpDm?: string;
}

export interface Settings {
    keyword: string;
    isSystemOnline: boolean;
    macros: Macro[];
    autoReply: string;
    dmReply: string;
    followUpDm: string;
    cooldownHours: number;
    keywordMode: "single" | "multi";
    keywordRules: KeywordRule[];
}

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

export async function getSettings(): Promise<Settings> {
    const client = await createClient();
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return DEFAULT_SETTINGS;

    const { data, error } = await client
        .from('settings')
        .select('*')
        .eq('owner_id', userData.user.id)
        .single();

    if (error || !data) {
        if (error && error.code !== 'PGRST116') {
            console.error("[Settings] Error fetching from Supabase:", error);
        }
        // If not found, attempts to initialize with defaults (only works if table exists)
        return DEFAULT_SETTINGS;
    }

    return {
        keyword: data.keyword || DEFAULT_SETTINGS.keyword,
        isSystemOnline: typeof data.is_system_online === 'boolean' ? data.is_system_online : (typeof data.isSystemOnline === 'boolean' ? data.isSystemOnline : DEFAULT_SETTINGS.isSystemOnline),
        autoReply: data.auto_reply || data.autoReply || DEFAULT_SETTINGS.autoReply,
        dmReply: data.dm_reply || data.dmReply || DEFAULT_SETTINGS.dmReply,
        followUpDm: data.follow_up_dm || data.followUpDm || DEFAULT_SETTINGS.followUpDm,
        cooldownHours: typeof data.cooldown_hours === 'number' ? data.cooldown_hours : (typeof data.cooldownHours === 'number' ? data.cooldownHours : DEFAULT_SETTINGS.cooldownHours),
        keywordMode: data.keyword_mode || data.keywordMode || DEFAULT_SETTINGS.keywordMode,
        keywordRules: Array.isArray(data.keyword_rules) ? data.keyword_rules : (Array.isArray(data.keywordRules) ? data.keywordRules : DEFAULT_SETTINGS.keywordRules),
        macros: Array.isArray(data.macros) ? data.macros : DEFAULT_SETTINGS.macros
    };
}

export async function getKeyword(): Promise<string> {
    const settings = await getSettings();
    return settings.keyword;
}

export async function saveKeyword(keyword: string): Promise<void> {
    await saveSettings({ keyword });
}

export async function saveMacros(macros: Macro[]): Promise<void> {
    await saveSettings({ macros });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
    const client = await createClient();
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return;

    // Map to camelCase by default (project standard)
    const dbUpdate: any = {};
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
        .upsert({ owner_id: userData.user.id, ...dbUpdate }, { onConflict: 'owner_id' });

    if (error) {
        // Fallback: If camelCase fails with PGRST204, try snake_case
        if (error.code === 'PGRST204') {
            const snakeUpdate: any = { owner_id: userData.user.id };
            if (settings.keyword !== undefined) snakeUpdate.keyword = settings.keyword;
            if (settings.isSystemOnline !== undefined) snakeUpdate.is_system_online = settings.isSystemOnline;
            if (settings.autoReply !== undefined) snakeUpdate.auto_reply = settings.autoReply;
            if (settings.dmReply !== undefined) snakeUpdate.dm_reply = settings.dmReply;
            if (settings.followUpDm !== undefined) snakeUpdate.follow_up_dm = settings.followUpDm;
            if (settings.cooldownHours !== undefined) snakeUpdate.cooldown_hours = settings.cooldownHours;
            if (settings.keywordMode !== undefined) snakeUpdate.keyword_mode = settings.keywordMode;
            if (settings.keywordRules !== undefined) snakeUpdate.keyword_rules = settings.keywordRules;
            if (settings.macros !== undefined) snakeUpdate.macros = settings.macros;
            await client.from('settings').upsert(snakeUpdate, { onConflict: 'owner_id' });
        } else {
            console.error("[Settings] Error saving to Supabase:", error);
        }
    }
}

export async function toggleSystemStatus(isOnline: boolean): Promise<void> {
    await saveSettings({ isSystemOnline: isOnline });
}
