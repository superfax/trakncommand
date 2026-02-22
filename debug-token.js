
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const APP_ID = process.env.FB_APP_ID;
const APP_SECRET = process.env.FB_APP_SECRET;


async function debugToken() {
    console.log("🚀 Deep-Scanning Token Scopes (v24.0)...");

    if (!ACCESS_TOKEN || !APP_ID || !APP_SECRET) {
        console.error("❌ Missing .env variables: FB_ACCESS_TOKEN, FB_APP_ID, or FB_APP_SECRET");
        return;
    }

    try {
        // 1. Official Token Inspection (Requires App Secret)
        const appToken = `${APP_ID}|${APP_SECRET}`;
        const debugRes = await fetch(
            `https://graph.facebook.com/v24.0/debug_token?input_token=${ACCESS_TOKEN}&access_token=${appToken}`
        );
        const debugData = await debugRes.json();
        console.log("--- RAW DEBUG DATA ---");
        console.log(JSON.stringify(debugData, null, 2));
        console.log("----------------------");

        if (debugData.error) {
            console.error("❌ Token Inspection Failed:", debugData.error.message);
            console.log("Tip: Make sure FB_APP_ID and FB_APP_SECRET match the app that generated the token.");
            return;
        }

        const info = debugData.data;
        console.log("\n🔎 TOKEN ANALYSIS:");
        console.log(`- Type: ${info.type}`);
        console.log(`- App: ${info.application}`);
        console.log(`- Is Valid: ${info.is_valid}`);
        console.log(`- Expires: ${info.expires_at ? new Date(info.expires_at * 1000).toLocaleString() : "Never (Long-Lived)"}`);

        console.log("\n✅ GRANTED SCOPES:");
        if (info.scopes) {
            info.scopes.forEach(s => console.log(`- ${s}`));
        } else {
            console.log("❌ NO SCOPES FOUND.");
        }

        const requiredScopes = ["instagram_basic", "instagram_manage_comments", "instagram_manage_messages", "pages_show_list", "pages_read_engagement"];
        const missing = requiredScopes.filter(s => !info.scopes?.includes(s));

        if (missing.length > 0) {
            console.log("\n⚠️ MISSING CRITICAL PERMISSIONS:");
            missing.forEach(s => console.log(`❌ ${s}`));
            console.log("\nAction Needed: You must re-generate a token in the Graph API Explorer and check these boxes.");
        } else {
            console.log("\n💎 PERMISSIONS PERFECT: All necessary scopes are present.");
        }

        // 2. Fetch Identity and linked Instagram account
        const meRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name,accounts{name,id,instagram_business_account}&access_token=${ACCESS_TOKEN}`);
        const meData = await meRes.json();

        console.log("\n👤 IDENTITY:");
        console.log(`- Token Owner: ${meData.name} (ID: ${meData.id})`);

        if (meData.accounts && meData.accounts.data) {
            console.log("\n📄 LINKED PAGES & IG ACCOUNTS:");
            meData.accounts.data.forEach(page => {
                console.log(`- Page: ${page.name} (ID: ${page.id})`);
                if (page.instagram_business_account) {
                    console.log(`  💎 IG Business Account ID: ${page.instagram_business_account.id} <--- USE THIS FOR FB_IG_BUSINESS_ID`);
                } else {
                    console.log(`  ⚠️ No Instagram account linked to this page.`);
                }
            });
        } else {
            // Check if it's already a Page Token
            const pageRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name,instagram_business_account&access_token=${ACCESS_TOKEN}`);
            const pageData = await pageRes.json();
            console.log(`- Active Object: ${pageData.name} (ID: ${pageData.id})`);
            if (pageData.instagram_business_account) {
                console.log(`  💎 IG Business Account ID: ${pageData.instagram_business_account.id} <--- USE THIS FOR FB_IG_BUSINESS_ID`);
            } else {
                console.log(`  ⚠️ This token object has no linked Instagram Business account.`);
            }
        }
        console.log("-----------------------------------\n");

    } catch (error) {
        console.error("❌ Error running debug script:", error);
    }
}

debugToken();
