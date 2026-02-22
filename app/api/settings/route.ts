import { NextRequest, NextResponse } from "next/server";
import { getSettings, toggleSystemStatus } from "@/lib/settings";

export const dynamic = 'force-dynamic';

export async function GET() {
    const settings = await getSettings();
    return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { saveSettings, getSettings } = await import("@/lib/settings");

        // Use the generic saveSettings for all valid fields
        await saveSettings({
            keyword: body.keyword,
            isSystemOnline: body.isSystemOnline,
            autoReply: body.autoReply,
            dmReply: body.dmReply,
            macros: body.macros
        });

        const updatedSettings = await getSettings();
        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error("[Settings API] POST Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
