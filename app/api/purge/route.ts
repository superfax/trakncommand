import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const { purgeActivities, purgeLeads } = await import("@/lib/storage");
        await purgeActivities();
        await purgeLeads();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Purge] Error:", error);
        return NextResponse.json({ error: "Purge failed" }, { status: 500 });
    }
}
