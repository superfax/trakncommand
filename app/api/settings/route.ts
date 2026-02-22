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

        // Handle System Status Toggle
        if (typeof body.isSystemOnline === "boolean") {
            await toggleSystemStatus(body.isSystemOnline);
        }

        // Handle Keyword Update
        if (typeof body.keyword === "string") {
            const { saveKeyword } = await import("@/lib/settings");
            await saveKeyword(body.keyword);
        }

        // Handle Macros Update
        if (Array.isArray(body.macros)) {
            const { saveMacros } = await import("@/lib/settings");
            await saveMacros(body.macros);
        }

        const updatedSettings = await getSettings();
        return NextResponse.json(updatedSettings);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
