
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const APP_ID = process.env.FB_APP_ID;

async function subscribePage() {
    console.log("🚀 Subscribing Page to App Webhooks...");

    if (!ACCESS_TOKEN) {
        console.error("❌ Missing FB_ACCESS_TOKEN in .env.local");
        return;
    }
    console.log(`🔑 Using Token: ${ACCESS_TOKEN.substring(0, 10)}... (Length: ${ACCESS_TOKEN.length})`);

    try {
        // 1. Get Page ID (from /me)
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${ACCESS_TOKEN}`);
        const me = await meRes.json();

        if (me.error) {
            console.error("❌ Failed to get Page ID:", me.error.message);
            return;
        }

        const PAGE_ID = me.id;
        console.log(`✅ Found Page: ${me.name} (ID: ${PAGE_ID})`);

        // 2. Subscribe App to Page
        const subRes = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps?access_token=${ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subscribed_fields: ["feed"] // Start with just 'feed' (which includes comments)
            })
        });

        const subData = await subRes.json();

        if (subData.success) {
            console.log("✅ SUCCESS! Application is now subscribed to Page events.");
            console.log("👉 Now retry your comment on Facebook.");
        } else {
            console.error("❌ Subscription Failed:");
            console.error(JSON.stringify(subData, null, 2));
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

subscribePage();
