
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID || "945833891950268";

// UPDATE THIS WITH YOUR CURRENT NGROK URL FROM start-tunnel.bat
const TUNNEL_URL = "https://alysha-untroublesome-uncontiguously.ngrok-free.dev";
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "TRAKN_COMMAND_V1";

async function syncWebhook() {
    console.log(`🚀 Synchronizing Meta Webhook to Local Tunnel: ${TUNNEL_URL}`);

    if (!ACCESS_TOKEN) {
        console.error("❌ Missing FB_ACCESS_TOKEN in .env.local");
        return;
    }

    try {
        // 1. Subscribe the App to the Page's Instagram signals
        console.log(`- Subscribing App to Page ${PAGE_ID}...`);
        const subRes = await fetch(`https://graph.facebook.com/v24.0/${PAGE_ID}/subscribed_apps?access_token=${ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subscribed_fields: ["instagram_manage_comments", "messages", "mentions"]
            })
        });
        const subData = await subRes.json();

        if (subData.success || subData.id) {
            console.log("✅ Successfully Subscribed App to Page signals.");
        } else {
            console.error("❌ Subscription Failed:", JSON.stringify(subData));
        }

        console.log("\n⚠️ IMPORTANT NEXT STEP:");
        console.log("Meta does not allow changing the 'Callback URL' via API for security.");
        console.log("You MUST manually paste this URL into the Meta Developer Portal:");
        console.log(`\n🔗 URL: ${TUNNEL_URL}/api/ig-webhook`);
        console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);
        console.log("\nGo here: https://developers.facebook.com/apps/4105785652972481/webhooks/");
        console.log("Select 'Instagram' from the dropdown and click 'Edit Subscription'.");

    } catch (error) {
        console.error("❌ Error syncing webhook:", error);
    }
}

syncWebhook();
