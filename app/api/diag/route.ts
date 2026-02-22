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
            url: {
                present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                value: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 15) + "..."
            },
            key: {
                present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                prefix_match: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ")
                    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_"),
                value_preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 5) + "..."
            },
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
        // The mock will now return a promise that resolves to {data: null} instead of crashing
        const result = await client.from('settings').select('count').limit(1);

        if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            status.supabase.error = "MISSING_ENVIRONMENT_VARIABLE: NEXT_PUBLIC_SUPABASE_ANON_KEY";
        } else if (result.error) {
            status.supabase.error = result.error;
        } else if (result.data === null && !status.supabase.key.present) {
            status.supabase.error = "MOCK_CLIENT_ACTIVE: Real connection failed.";
        } else {
            status.supabase.connected = true;
        }
    } catch (e: any) {
        status.supabase.error = `CATCH_ERROR: ${e.message || e}`;
    }

    return NextResponse.json(status);
}
