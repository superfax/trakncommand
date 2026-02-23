import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { saveLead, deleteLead, updateLeadStatus } from "@/lib/storage";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { handle, id, status, tags, name } = body;

        if (!handle || !id) {
            return NextResponse.json({ error: "Missing handle or id" }, { status: 400 });
        }

        await saveLead({
            id,
            handle,
            status: status || "new",
            tags: tags || [],
            name: name || "",
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Leads POST] Error:", error);
        return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        // Dynamic import to avoid circular issues
        const { deleteLead, purgeLeads } = await import("@/lib/storage");

        if (id) {
            await deleteLead(id);
        } else {
            await purgeLeads();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Leads DELETE] Error:", error);
        return NextResponse.json({ error: "Failed to delete lead(s)" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
        }

        await updateLeadStatus(id, status);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Leads PATCH] Error:", error);
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}
