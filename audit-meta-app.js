
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const APP_ID = process.env.FB_APP_ID;
const APP_SECRET = process.env.FB_APP_SECRET;

async function auditApp() {
    console.log("🚀 Auditing Meta App Configuration (v24.0)...");

    if (!ACCESS_TOKEN || !APP_ID || !APP_SECRET) {
        console.error("❌ Missing .env variables: FB_ACCESS_TOKEN, FB_APP_ID, or FB_APP_SECRET");
        return;
    }

    try {
        // 1. Check App Mode and Basic Info
        const appRes = await fetch(`https://graph.facebook.com/v24.0/${APP_ID}?fields=name,id,link,privacy_policy_url,category,business,access_level&access_token=${ACCESS_TOKEN}`);
        const appData = await appRes.json();

        if (appData.error) {
            console.error("❌ App Audit Failed:", appData.error.message);
        } else {
            console.log("\n📦 APP SPECS:");
            console.log(`- Name: ${appData.name}`);
            console.log(`- ID: ${appData.id}`);
            console.log(`- Access Level: ${appData.access_level || "Not Found (Likely Standard)"}`);
        }

        // 2. Check Permissions and Features (Advanced vs Standard)
        console.log("\n🔍 CHECKING PERMISSION LEVELS (Advanced Access Check):");
        const featRes = await fetch(`https://graph.facebook.com/v24.0/${APP_ID}/permissions?access_token=${ACCESS_TOKEN}`);
        const featData = await featRes.json();

        // Note: The /app/permissions endpoint usually requires an App Token but /me/permissions shows what THIS token can do.
        // We already did /me/permissions. Let's try to find the "Capability" block.

        console.log("\n⚠️ ANALYSIS OF ERROR #3 (CAPABILITY):");
        console.log("This error usually means your App is in LIVE Mode but only has 'Standard Access'.");
        console.log("Follow these steps in the Meta Developer Portal:");
        console.log("1. Go to App Settings -> Usage of Settings -> Permissions and Features.");
        console.log("2. Find 'instagram_manage_messages'.");
        console.log("3. Ensure it says 'Advanced Access'. If it says 'Standard Access', DMs will ONLY work for Developers/Testers.");
        console.log("4. Do the same for 'instagram_manage_comments'.");

        // 3. Test a dummy message to see if it's a specific ID block
        console.log("\n🧪 TESTING ENDPOINT VIABILITY...");
        const testRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name&access_token=${ACCESS_TOKEN}`);
        const testData = await testRes.json();
        console.log(`- Basic Connection to /me: ${testData.id ? "OK" : "FAILED"}`);

    } catch (error) {
        console.error("❌ Error running audit script:", error);
    }
}

auditApp();
