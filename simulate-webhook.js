
async function simulateWebhook(type = "comment") {
    console.log(`🚀 Simulating Instagram ${type === "comment" ? "Comment" : "DM"} Event...`);

    const payload = {
        object: "instagram",
        entry: [
            {
                id: "17841400000000000",
                time: Date.now(),
                changes: type === "comment" ? [
                    {
                        value: {
                            from: { id: "123456789", username: "test_user_vip" },
                            text: "Yo this looks sick! I want in. PRO status!",
                            id: "comment_12345",
                            media: {
                                id: "media_12345",
                                media_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=200&auto=format&fit=crop",
                                caption: "Launching the new Trakn Command Center v1.0"
                            }
                        },
                        field: "comments"
                    }
                ] : [],
                messaging: type === "dm" ? [
                    {
                        sender: { id: "987654321" },
                        recipient: { id: "17841400000000000" },
                        timestamp: Date.now(),
                        message: {
                            mid: "dm_mid_67890",
                            text: "I missed the post but I want the PRO link!"
                        }
                    }
                ] : []
            }
        ]
    };

    try {
        const response = await fetch("http://localhost:3000/api/ig-webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("✅ Webhook sent successfully!");
        } else {
            console.error("❌ Webhook failed:", response.status, await response.text());
        }
    } catch (error) {
        console.error("❌ Simulation Error:", error);
    }
}

// Map command line args or default to comment
const type = process.argv[2] || "comment";
simulateWebhook(type);
