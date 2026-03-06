import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { serverSaveLead, serverUpdateLeadStatus } from "@/lib/serverStorage";
import { createServiceClient } from "@/utils/supabase/service";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { handle, id, status, tags, name } = body;

        if (!handle || !id) {
            return NextResponse.json({ error: "Missing handle or id" }, { status: 400 });
        }

        await serverSaveLead({
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

        const client = createServiceClient();
        const ownerId = process.env.TRAKN_OWNER_ID!;

        if (id) {
            await client.from('leads').delete().eq('id', id).eq('owner_id', ownerId);
        } else {
            await client.from('leads').delete().eq('owner_id', ownerId);
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
        const { id, status, notes } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        const client = createServiceClient();
        const ownerId = process.env.TRAKN_OWNER_ID!;

        const updateData: any = {};
        if (status !== undefined) updateData.status = status;

        if (notes !== undefined) {
            const { data } = await client.from('leads').select('*').eq('id', id).eq('owner_id', ownerId).single();
            if (data) {
                let newTags = data.tags ? data.tags.filter((t: string) => !t.startsWith("NOTE::::")) : [];
                if (notes) newTags.push(`NOTE::::${notes}`);
                updateData.tags = newTags;
            }
        }

        if (Object.keys(updateData).length > 0) {
            await client.from('leads').update(updateData).eq('id', id).eq('owner_id', ownerId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Leads PATCH] Error:", error);
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}
