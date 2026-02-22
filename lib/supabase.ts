import { createClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;

export function getSupabase() {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
        // During build, environment variables might be missing.
        // We return a proxy or a dummy object to prevent crashes,
        // but real calls will only happen at runtime on Vercel.
        return new Proxy({}, {
            get: () => {
                console.warn("[Supabase] Attempted to access client before initialization.");
                return () => ({ data: null, error: { message: "Not initialized" } });
            }
        });
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
}
