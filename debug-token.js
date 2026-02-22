
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const APP_ID = process.env.FB_APP_ID;
const APP_SECRET = process.env.FB_APP_SECRET;

async function debugToken() {
    console.log("🚀 Debugging Current Token...");

    if (!ACCESS_TOKEN || !APP_ID || !APP_SECRET) {
        console.error("❌ Missing .env variables");
        return;
    }

    try {
        // 1. Debug via /me/permissions (Simpler, works even if App ID mismatches)
        const debugRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,permissions&access_token=${ACCESS_TOKEN}`);
        const debugData = await debugRes.json();

        if (debugData.error) {
            console.error("❌ Token Inspection Failed:", debugData.error.message);
            return;
        }

        console.log("\n🔎 TOKEN INSPECTION:");
        console.log(`User Name: ${debugData.name}`);
        console.log(`User ID: ${debugData.id}`);
        console.log("-----------------------------------");
        console.log("✅ GRANTED PERMISSIONS (SCOPES):");
        if (debugData.permissions && debugData.permissions.data) {
            debugData.permissions.data.forEach(p => {
                if (p.status === 'granted') console.log(`- ${p.permission}`);
            });
        }
        console.log("-----------------------------------");

        // 2. Try fetching pages one more time with full error logging
        const pageRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${ACCESS_TOKEN}`);
        const pageData = await pageRes.json();

        console.log("\n📄 PAGES FOUND:");
        if (pageData.data && pageData.data.length > 0) {
            console.log(`Found ${pageData.data.length} pages.`);
            pageData.data.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
        } else {
            console.log("❌ ZERO PAGES FOUND.");
            console.log("Raw Response:", JSON.stringify(pageData, null, 2));
        }

    } catch (error) {
        console.error("❌ Network/Script Error:", error);
    }
}

debugToken();
