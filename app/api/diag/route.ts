import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const status: any = {
        timestamp: new Date().toISOString(),
        env: {
            NEXT_PHASE: process.env.NEXT_PHASE || "undefined",
            NODE_ENV: process.env.NODE_ENV
        },
        supabase: {
            connected: false,
            url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            key_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            key_preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + "...",
            error: null as any
        },
        meta: {
            verify_token_present: !!process.env.FB_VERIFY_TOKEN,
            access_token_present: !!process.env.FB_ACCESS_TOKEN,
            business_id_present: !!process.env.FB_IG_BUSINESS_ID
        }
    };

    try {
        const client = await getSupabaseClient();
        const { data, error } = await client.from('settings').select('count').limit(1);
        if (error) {
            status.supabase.error = error;
        } else {
            status.supabase.connected = true;
        }
    } catch (e: any) {
        status.supabase.error = e.message || e;
    }

    return NextResponse.json(status);
}
