import fs from "fs/promises";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

async function ensureDataDir() {
    const dir = path.dirname(SETTINGS_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

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

export async function getSettings(): Promise<Settings> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(SETTINGS_FILE, "utf-8");
        const json = JSON.parse(data);
        return {
            keyword: json.keyword || "PRO",
            isSystemOnline: typeof json.isSystemOnline === "boolean" ? json.isSystemOnline : false,
            autoReply: json.autoReply || "Check Dm for Your Access. :)",
            macros: Array.isArray(json.macros) ? json.macros : [
                { label: "⚡ Pricing", text: "Hey! Our plans start at $29/mo. Check trakn.pro/pricing 🚀" },
                { label: "📞 Call", text: "Let's chat! Book a demo here: trakn.pro/demo 📅" },
                { label: "👋 Welcome", text: "Welcome to the crew! Any questions? 👊" }
            ]
        };
    } catch {
        return {
            keyword: "PRO",
            isSystemOnline: false,
            autoReply: "Check Dm for Your Access. :)",
            macros: [
                { label: "⚡ Pricing", text: "Hey! Our plans start at $29/mo. Check trakn.pro/pricing 🚀" },
                { label: "📞 Call", text: "Let's chat! Book a demo here: trakn.pro/demo 📅" },
                { label: "👋 Welcome", text: "Welcome to the crew! Any questions? 👊" }
            ]
        };
    }
}

export async function getKeyword(): Promise<string> {
    const settings = await getSettings();
    return settings.keyword;
}

export async function saveKeyword(keyword: string): Promise<void> {
    const current = await getSettings();
    await saveSettings({ ...current, keyword });
}
export async function saveMacros(macros: Macro[]): Promise<void> {
    const current = await getSettings();
    await saveSettings({ ...current, macros });
}


export async function saveSettings(settings: Partial<Settings>): Promise<void> {
    await ensureDataDir();
    // Merge with existing
    const current = await getSettings();
    const newSettings = { ...current, ...settings };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));
}

export async function toggleSystemStatus(isOnline: boolean): Promise<void> {
    const current = await getSettings();
    await saveSettings({ ...current, isSystemOnline: isOnline });
}
