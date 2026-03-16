
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(url, key);

async function purgeAll() {
    console.log("🔥 Purging Live Activity Feed and Leads...");

    try {
        // 1. Purge Activity
        const { error: activityError } = await supabase
            .from('activity')
            .delete()
            .neq('id', '0');

        if (activityError) {
            console.error("❌ Error purging activity:", activityError);
        } else {
            console.log("✅ Activity Feed Purged");
        }

        // 2. Purge Leads
        const { error: leadsError } = await supabase
            .from('leads')
            .delete()
            .neq('id', '0');

        if (leadsError) {
            console.error("❌ Error purging leads:", leadsError);
        } else {
            console.log("✅ Leads Purged");
        }

        console.log("\n🚀 All data purged successfully. Ready for a clean demo!");
    } catch (err) {
        console.error("❌ Fatal Purge Error:", err);
    }
}

purgeAll();
