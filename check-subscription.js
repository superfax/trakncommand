
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function checkIds() {
    try {
        // 1. Check Me (Who owns the token?)
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${ACCESS_TOKEN}&fields=id,name`);
        const me = await meRes.json();
        console.log("Full Me Response:", JSON.stringify(me, null, 2)); // Debug this
        console.log("Token Owner:", me.name, `(${me.id})`);

        if (me.id) {
            // 2. Check Subscriptions for this Object
            const subRes = await fetch(`https://graph.facebook.com/v19.0/${me.id}/subscribed_apps?access_token=${ACCESS_TOKEN}`);
            const subData = await subRes.json();
            console.log("Active Subscriptions:", JSON.stringify(subData, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

checkIds();
