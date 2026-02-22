// lib/supabase.ts
// Shared utility for build-safe Supabase initialization.

async function getSupabaseClient() {
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
        (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Strict validation: URLs must be real, Keys must be JWT (start with eyJ)
    const isValid = (u?: string, k?: string) => {
        if (!u || !k || u === "" || k === "") return false;
        if (isBuildPhase) return false;
        if (!u.startsWith("https://")) return false;
        if (!k.startsWith("eyJ") && !k.startsWith("sb_")) return false;
        if (k.length < 20) return false;
        return true;
    };

    if (!isValid(url, key)) {
        console.warn(`[Supabase] Invalid Credentials or Build Phase. URL=${!!url}, Key=${!!key}, Build=${isBuildPhase}`);

        const createMock: any = () => {
            const handler: ProxyHandler<any> = {
                get: (target, prop) => {
                    if (prop === 'then') {
                        return (resolve: any) => resolve({ data: null, error: null, count: 0 });
                    }
                    return () => new Proxy(() => { }, handler);
                },
                apply: () => {
                    return new Proxy(() => { }, handler);
                }
            };

            const proxy = new Proxy(() => { }, handler);
            return {
                from: () => proxy,
                auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
                rpc: () => proxy
            };
        };

        return createMock();
    }

    try {
        const { createClient } = await import('@supabase/supabase-js');
        return createClient(url!, key!);
    } catch (e) {
        console.error("[Supabase] Failed to initialize client:", e);
        return { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any;
    }
}

export { getSupabaseClient };
