import { NextRequest, NextResponse } from "next/server";
import { getServerSettings, serverSaveSettings } from "@/lib/serverStorage";

export const dynamic = 'force-dynamic';

export async function GET() {
    const settings = await getServerSettings();
    return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        await serverSaveSettings({
            keyword: body.keyword,
            isSystemOnline: body.isSystemOnline,
            autoReply: body.autoReply,
            dmReply: body.dmReply,
            followUpDm: body.followUpDm,
            cooldownHours: body.cooldownHours,
            keywordMode: body.keywordMode,
            keywordRules: body.keywordRules,
            macros: body.macros,
        });

        const updatedSettings = await getServerSettings();
        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error("[Settings API] POST Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
