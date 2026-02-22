
require('dotenv').config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function getPageTokens() {
    console.log("🚀 Fetching Page Access Tokens...");

    if (!ACCESS_TOKEN) {
        console.error("❌ Missing FB_ACCESS_TOKEN in .env.local");
        return;
    }

    try {
        const response = await axios.get(`https://graph.facebook.com/v24.0/me/accounts`, {
            params: {
                access_token: ACCESS_TOKEN
            }
        });
        const data = response.data;

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        if (data.data && data.data.length > 0) {
            console.log("✅ SUCCESS! Found Pages:");
            data.data.forEach(page => {
                console.log(`\n📄 Page Name: ${page.name}`);
                console.log(`🆔 Page ID: ${page.id}`);
                console.log(`🔑 PAGE TOKEN: ${page.access_token.substring(0, 20)}...[See token.txt]`);
                // Write to file to avoid truncation
                require('fs').writeFileSync('token.txt', page.access_token);
                console.log("✅ Full token saved to 'token.txt'");
                console.log("-----------------------------------");
            });
        } else {
            console.log("⚠️ No Pages found. Ensure the User Token implies 'pages_show_list' or 'pages_read_engagement'.");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

getPageTokens();
