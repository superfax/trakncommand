
async function simulateFacebookWebhook() {
    console.log("🚀 Simulating Facebook Page Webhook Event...");

    const payload = {
        object: "page",
        entry: [
            {
                id: "100055555555",
                time: 1679000000,
                changes: [
                    {
                        field: "feed",
                        value: {
                            item: "comment",
                            comment_id: `facebook_comment_${Date.now()}`,
                            message: "This is a test comment from Facebook! PRO status please.",
                            sender_name: "Mark Z",
                            created_time: 1679000000,
                            post_id: "feed_post_123",
                            from: {
                                name: "Mark Zuckerberg",
                                id: `fb_user_${Date.now()}`
                            }
                        }
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch("http://localhost:3000/api/ig-webhook", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("✅ Facebook Webhook sent successfully!");
            console.log("Status:", response.status, response.statusText);
            console.log("Check your running server terminal for the logs.");
        } else {
            console.error("❌ Webhook failed:", response.status, response.statusText);
            const text = await response.text();
            console.error("Response:", text);
        }
    } catch (error) {
        console.error("❌ Simulation Error:", error);
    }
}

simulateFacebookWebhook();
