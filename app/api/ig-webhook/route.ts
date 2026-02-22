import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Verify Token should be an environment variable
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "TRAKN_COMMAND_V1";

export async function GET(req: NextRequest) {
    // Verification request from Meta
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("WEBHOOK_VERIFIED");
        return new NextResponse(challenge, { status: 200 });
    } else {
        return new NextResponse("Forbidden", { status: 403 });
    }
}

// Helper to dynamically import lib modules
async function getLib() {
    const settings = await import("@/lib/settings");
    const storage = await import("@/lib/storage");
    const instagram = await import("@/lib/instagram");
    return { ...settings, ...storage, ...instagram };
}

// Helper to process in background
async function processWebhookEvent(body: any) {
    try {
        const { getSettings, saveLead, hasContactedUser, logActivity, updateActivityStatus, sendPrivateReply, likeComment, wait } = await getLib();
        const settings = await getSettings();

        // Safety Check 1: Master Toggle
        if (!settings.isSystemOnline) {
            console.log("⚠️ WEBHOOK IGNORED: System is OFFLINE.");
            return;
        }

        const triggerKeyword = settings.keyword;

        for (const entry of body.entry) {
            if (entry.changes) {
                for (const change of entry.changes) {
                    const isInstagramComment = change.field === "comments";
                    const isFacebookComment = change.field === "feed" && change.value.item === "comment";
                    const isInstagramMessage = entry.messaging && entry.messaging.length > 0;

                    if (isInstagramComment || isFacebookComment || isInstagramMessage) {
                        let userId = "";
                        let username = "";
                        let commentText = "";
                        let commentId = "";
                        let parentId = "";
                        let media = { media_url: undefined, caption: undefined };
                        let isDM = false;

                        if (isInstagramMessage) {
                            const msg = entry.messaging[0];
                            userId = msg.sender?.id;
                            username = `User_${userId.slice(-4)}`; // DMs don't always provide username in the body
                            commentText = msg.message?.text || "";
                            commentId = msg.message?.mid;
                            isDM = true;
                        } else {
                            const value = change.value;
                            commentText = change.field === "feed" ? value.message : (value.text || "");
                            const from = value.from || {};
                            userId = from.id;
                            username = from.name || from.username;
                            media = value.media || {};
                            commentId = change.field === "feed" ? value.comment_id : value.id;
                            parentId = value.parent_id;
                        }

                        // 🔍 IMPROVED: Ignore messages from the business itself
                        const selfHandles = ["traknpro", "isellbeatsapp"];
                        const isSelf = selfHandles.includes(username.toLowerCase()) ||
                            commentText === settings.autoReply;

                        if (isSelf) {
                            console.log(`⏭️ Ignoring self-interaction from ${username}`);
                            continue;
                        }

                        console.log(`Received ${isDM ? 'DM' : 'comment'} from ${username}: ${commentText}`);

                        // Log initial receipt
                        await logActivity({
                            id: `rx-${Date.now()}`,
                            handle: username,
                            comment: isDM ? `📩 (DM): ${commentText}` : commentText,
                            status: "pending",
                            timestamp: new Date().toLocaleTimeString(),
                            postImage: media.media_url,
                            postCaption: media.caption,
                            commentId: parentId || commentId,
                            userId,
                        });

                        // Keyword Trigger Check
                        if (commentText.toUpperCase().includes(triggerKeyword.toUpperCase())) {

                            // Safety Check 2: Duplicate / Cooldown
                            const alreadyContacted = await hasContactedUser(userId);
                            if (alreadyContacted) {
                                console.log(`⚠️ User ${username} already contacted. Skipping.`);
                                await logActivity({
                                    id: `skip-${Date.now()}`,
                                    handle: username,
                                    comment: "Duplicate skipped",
                                    status: "failed",
                                    timestamp: new Date().toLocaleTimeString()
                                });
                                continue;
                            }

                            console.log("Keyword Matched! Initiating workflow...");

                            // Humanization 1: Like the comment immediately
                            await likeComment(commentId);

                            // Simulate AI Tagging
                            const potentialTags = ["VIP", "High Value", "Early Access", "Influencer"];
                            const randomTag = potentialTags[Math.floor(Math.random() * potentialTags.length)];

                            // 1. Save Lead (Mark as contacted)
                            await saveLead({
                                id: userId,
                                handle: username,
                                timestamp: new Date().toISOString(),
                                status: "new",
                                tags: [randomTag] // New: AI Tagging
                            });

                            // 2. Human Delay (5-45s)
                            const minDelay = 5000;
                            const maxDelay = 45000;
                            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);

                            console.log(`Waiting ${delay}ms...`);
                            await wait(delay);

                            // 3. Reply using the configured auto-reply message from settings
                            const success = await sendPrivateReply(userId, settings.autoReply, commentId);

                            if (success) {
                                console.log("Reply Sent Successfully.");
                                // Update original "pending" activity item with reply text
                                await updateActivityStatus(commentId, "sent", settings.autoReply);
                            } else {
                                await updateActivityStatus(commentId, "failed", "Reply failed to send");
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Background Processing Error:", error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("📥 WEBHOOK RECEIVED:", JSON.stringify(body, null, 2)); // LOG EVERYTHING

        if (body.object === "instagram" || body.object === "page") {

            // FIRE AND FORGET:
            // We do NOT await this. We let it run in the background.
            // This ensures we return 200 OK instantly to Meta.
            processWebhookEvent(body);

            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        } else {
            return new NextResponse("Not Found", { status: 404 });
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
