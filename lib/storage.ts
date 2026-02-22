import fs from "fs/promises";
import path from "path";
import { Lead } from "@/components/MiniCRM";
import { ActivityItem } from "@/components/LiveActivityFeed";

const LEADS_FILE = path.join(process.cwd(), "data", "leads.json");
const ACTIVITY_FILE = path.join(process.cwd(), "data", "activity.json");

async function ensureDataDir() {
    const dir = path.dirname(LEADS_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// --- LEADS ---

export async function getLeads(): Promise<Lead[]> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(LEADS_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function saveLead(lead: Lead): Promise<void> {
    const leads = await getLeads();
    if (leads.some((l) => l.id === lead.id)) return;

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

    leads.unshift(enriched);
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
}

export async function hasContactedUser(userId: string): Promise<boolean> {
    const leads = await getLeads();
    // Assuming if they are in leads, we contacted them. 
    // You could check a specific 'status' field if needed.
    return leads.some(l => l.id === userId);
}

export async function deleteLead(leadId: string): Promise<void> {
    const leads = await getLeads();
    const updated = leads.filter(l => l.id !== leadId);
    await fs.writeFile(LEADS_FILE, JSON.stringify(updated, null, 2));
}

// --- ACTIVITY LOGS ---

export async function getActivity(): Promise<ActivityItem[]> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(ACTIVITY_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function logActivity(item: ActivityItem): Promise<void> {
    const activity = await getActivity();

    // If an item with the same ID already exists, update it instead of unshifting
    const existingIdx = activity.findIndex(a => a.id === item.id);
    if (existingIdx !== -1) {
        activity[existingIdx] = { ...activity[existingIdx], ...item };
    } else {
        activity.unshift(item);
    }

    // Keep only last 50 logs to prevent file bloat
    const trimmed = activity.slice(0, 50);
    await fs.writeFile(ACTIVITY_FILE, JSON.stringify(trimmed, null, 2));
}

export async function updateActivityStatus(
    commentId: string,
    status: "sent" | "failed",
    replyText?: string
): Promise<void> {
    const activity = await getActivity();
    const item = activity.find(a => a.commentId === commentId && a.status === "pending");

    if (item) {
        item.status = status;
        if (replyText) item.replyText = replyText;
        await fs.writeFile(ACTIVITY_FILE, JSON.stringify(activity, null, 2));
    }
}
