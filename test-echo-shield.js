
async function testWebhook(label, payload) {
    console.log(`\n🔍 Testing: ${label}...`);
    try {
        const response = await fetch("http://localhost:3000/api/ig-webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const text = await response.text();
        console.log(`Result: HTTP ${status} - ${text}`);
        return status;
    } catch (error) {
        console.error(`❌ Error in ${label}:`, error.message);
        return 500;
    }
}

async function runTests() {
    console.log("🚀 Starting Echo Shield Verification Tests");

    const BOT_ID = "17841480450586346";
    const USER_ID = "123456789";

    // 1. Normal User Message (Should PASS)
    await testWebhook("Normal User Message", {
        object: "instagram",
        entry: [{
            messaging: [{
                sender: { id: USER_ID },
                recipient: { id: BOT_ID },
                message: { text: "access" }
            }]
        }]
    });

    // 2. User mentioning keywords (Should PASS - avoid false positives)
    await testWebhook("User mentioning keywords", {
        object: "instagram",
        entry: [{
            messaging: [{
                sender: { id: USER_ID },
                recipient: { id: BOT_ID },
                message: { text: "I want exclusive access to trakn.pro/access" }
            }]
        }]
    });

    // 3. Bot ID but NO signature (Should PASS - if bot ever sends a simple 'hello'?)
    await testWebhook("Bot ID but NO signature", {
        object: "instagram",
        entry: [{
            messaging: [{
                sender: { id: BOT_ID },
                recipient: { id: USER_ID },
                message: { text: "hello" }
            }]
        }]
    });

    // 4. Bot ID AND signature (Should be BLOCKED)
    await testWebhook("Bot ID + Signature (Blocked)", {
        object: "instagram",
        entry: [{
            messaging: [{
                sender: { id: BOT_ID },
                recipient: { id: USER_ID },
                message: { text: "📩 (DM): Here is your exclusive access! https://trakn.pro/access" }
            }]
        }]
    });

    // 5. Explicit Echo + Signature (Should be BLOCKED)
    await testWebhook("Explicit Echo + Signature (Blocked)", {
        object: "instagram",
        entry: [{
            messaging: [{
                sender: { id: USER_ID },
                recipient: { id: BOT_ID },
                message: { is_echo: true, text: "Trakn Automator: Workflow Finished" }
            }]
        }]
    });

    console.log("\n✅ Test Suite Completed");
}

runTests();
