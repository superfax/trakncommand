
// test-public-connectivity.js

async function testPublic() {
    // 1. Get Ngrok URL
    let publicUrl = "";
    try {
        const tunnelRes = await fetch("http://127.0.0.1:4040/api/tunnels");
        const tunnelData = await tunnelRes.json();
        publicUrl = tunnelData.tunnels[0].public_url;
        console.log("🌍 Public Ngrok URL:", publicUrl);
    } catch (e) {
        console.error("❌ Could not get Ngrok URL. Is Ngrok running?");
        return;
    }

    // 2. Send Fake Webhook via PUBLIC INTERNET
    console.log("🚀 Sending POST request from the outside world...");

    try {
        const res = await fetch(`${publicUrl}/api/ig-webhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "FacebookPlatform" // Mimic Meta
            },
            body: JSON.stringify({
                object: "page",
                entry: [{
                    id: "TEST_PAGE_ID",
                    time: Date.now(),
                    changes: [{
                        field: "feed",
                        value: {
                            item: "comment",
                            post_id: "TEST_POST_ID",
                            comment_id: "TEST_COMMENT_ID",
                            message: "THIS IS A PUBLIC CONNECTIVITY TEST",
                            from: {
                                id: "TEST_USER_ID",
                                name: "Test User"
                            }
                        }
                    }]
                }]
            })
        });

        console.log(`📡 Response Code: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`📝 Response Body: ${text}`);

    } catch (e) {
        console.error("❌ Request Failed:", e.message);
    }
}

testPublic();
