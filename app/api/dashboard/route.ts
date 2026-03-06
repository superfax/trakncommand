import { NextResponse } from "next/server";
import { serverGetActivities } from "@/lib/serverStorage";
import { createServiceClient } from "@/utils/supabase/service";

export const dynamic = 'force-dynamic';

export async function GET() {
    const ownerId = process.env.TRAKN_OWNER_ID!;
    const client = createServiceClient();

    const { data: leads } = await client.from('leads').select('*').eq('owner_id', ownerId).order('timestamp', { ascending: false });
    const activity = await serverGetActivities();

    return NextResponse.json({
        leads: leads || [],
        activity
    });
}
