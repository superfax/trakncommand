import { getSupabaseClient } from "./supabase";

export interface Macro {
    label: string;
    text: string;
}

export interface Settings {
    keyword: string;
    isSystemOnline: boolean;
    macros: Macro[];
    autoReply: string;
}

const DEFAULT_SETTINGS: Settings = {
    keyword: "PRO",
    isSystemOnline: true, // Default to true for new setups
    autoReply: "Check Dm for Your Access. :)",
    macros: [
        { label: "⚡ Pricing", text: "Hey! Our plans start at $29/mo. Check trakn.pro/pricing 🚀" },
        { label: "📞 Call", text: "Let's chat! Book a demo here: trakn.pro/demo 📅" },
        { label: "👋 Welcome", text: "Welcome to the crew! Any questions? 👊" }
    ]
};

export async function getSettings(): Promise<Settings> {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('settings')
        .select('*')
        .eq('id', 1)
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
    const client = await getSupabaseClient();

    // Convert to DB format (Case-Resilient: Send both snake and camel)
    const dbUpdate: any = {};
    if (settings.keyword !== undefined) dbUpdate.keyword = settings.keyword;

    if (settings.isSystemOnline !== undefined) {
        dbUpdate.is_system_online = settings.isSystemOnline;
        dbUpdate.isSystemOnline = settings.isSystemOnline;
    }

    if (settings.autoReply !== undefined) {
        dbUpdate.auto_reply = settings.autoReply;
        dbUpdate.autoReply = settings.autoReply;
    }

    if (settings.macros !== undefined) dbUpdate.macros = settings.macros;

    const { error } = await client
        .from('settings')
        .upsert({ id: 1, ...dbUpdate }, { onConflict: 'id' });

    if (error) {
        console.error("[Settings] Error saving to Supabase:", error);
    }
}

export async function toggleSystemStatus(isOnline: boolean): Promise<void> {
    await saveSettings({ isSystemOnline: isOnline });
}
