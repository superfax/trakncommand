import { NextResponse } from "next/server";
import { getActivity, getLeads } from "@/lib/storage";

export async function GET() {
    const leads = await getLeads();
    const activity = await getActivity();

    return NextResponse.json({
        leads,
        activity
    });
}
