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

        // Return a robust mock Proxy to prevent "is not a function" crashes
        const createMock: any = () => {
            const chain = () => {
                const proxy: any = new Proxy(() => { }, {
                    get: (target, prop) => {
                        if (prop === 'then') return undefined; // Not a promise until called
                        return proxy;
                    },
                    apply: () => {
                        // When called, return a promise or the proxy itself
                        return Promise.resolve({ data: null, error: null, count: 0 });
                    }
                });
                return proxy;
            };

            return {
                from: chain,
                auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
                rpc: chain
            } as any;
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
