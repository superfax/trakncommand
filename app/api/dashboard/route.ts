import { NextResponse } from "next/server";
import { getActivities, getLeads } from "@/lib/storage";

export const dynamic = 'force-dynamic';

export async function GET() {
    const leads = await getLeads();
    const activity = await getActivities();

    return NextResponse.json({
        leads,
        activity
    });
}
