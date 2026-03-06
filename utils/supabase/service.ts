// Service role client — bypasses RLS entirely.
// ONLY use this in server-side API routes that run without a user session (e.g. webhooks).
// NEVER expose this to the browser.
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!url || !serviceKey) {
        throw new Error('[Supabase Service] Missing SUPABASE_SERVICE_ROLE_KEY env var')
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
