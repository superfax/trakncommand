import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { saveLead, hasContactedUser, logActivity, updateActivityStatus } from "@/lib/storage";
import { sendPrivateReply, likeComment, wait } from "@/lib/instagram";

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

// Helper to process in background (now awaited for Vercel stability)
async function processWebhookEvent(body: any) {
    try {
        const settings = await getSettings();
        console.log(`[Webhook] Settings Loaded: Online=${settings.isSystemOnline}, Keyword="${settings.keyword}"`);

        // Safety Check 1: Master Toggle
        if (!settings.isSystemOnline) {
            console.log("⚠️ WEBHOOK IGNORED: System is OFFLINE in Supabase Settings.");
            return;
        }

        const triggerKeyword = settings.keyword;

        for (const entry of body.entry) {
            const interactions: any[] = [];

            // 1. Collect DMs (Direct Messaging)
            if (entry.messaging) {
                for (const msg of entry.messaging) {
                    if (msg.message && msg.message.text) {
                        interactions.push({
                            userId: msg.sender?.id,
                            username: `User_${msg.sender?.id?.toString().slice(-4)}`,
                            commentText: msg.message.text,
                            commentId: msg.message.mid,
                            isDM: true,
                            media: {}
                        });
                    }
                }
            }

            // 2. Collect Comments (Changes)
            if (entry.changes) {
                for (const change of entry.changes) {
                    const value = change.value;
                    if (!value) continue;

                    const isInstagramComment = change.field === "comments";
                    const isFacebookComment = change.field === "feed" && value.item === "comment";

                    if (isInstagramComment || isFacebookComment) {
                        const from = value.from || {};
                        interactions.push({
                            userId: from.id,
                            username: from.name || from.username || `User_${from.id?.toString().slice(-4)}`,
                            commentText: change.field === "feed" ? value.message : (value.text || ""),
                            commentId: change.field === "feed" ? value.comment_id : value.id,
                            parentId: value.parent_id,
                            media: value.media || {},
                            isDM: false
                        });
                    }
                }
            }

            // 3. Process each interaction
            for (const item of interactions) {
                const { userId, username, commentText, commentId, parentId, media, isDM } = item;

                console.log(`[Webhook] Processing interaction from ${username} (${isDM ? 'DM' : 'Comment'})`);

                // 🔍 IMPROVED: Ignore messages from the business itself
                const selfHandles = ["traknpro", "isellbeatsapp"];
                const isSelf = selfHandles.includes(username.toLowerCase()) ||
                    commentText === settings.autoReply;

                if (isSelf) {
                    console.log(`⏭️ Ignoring self-interaction from ${username}`);
                    continue;
                }

                console.log(`[Webhook] Receipt: ${username} said "${commentText}"`);

                // Log initial receipt (Now uses mapped snake_case in storage.ts)
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
                    console.log(`🎯 Keyword Match: "${triggerKeyword}" found in "${commentText}"`);

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

                    // Humanization 1: Like the comment immediately (Only for non-DMs)
                    if (!isDM) {
                        await likeComment(commentId);
                    }

                    // Simulate AI Tagging
                    const potentialTags = ["VIP", "High Value", "Early Access", "Influencer"];
                    const randomTag = potentialTags[Math.floor(Math.random() * potentialTags.length)];

                    // 1. Save Lead (Mark as contacted)
                    await saveLead({
                        id: userId,
                        handle: username,
                        timestamp: new Date().toISOString(),
                        status: "new",
                        tags: [randomTag]
                    });

                    // 2. Human Delay (1-2s) - Minimum for Vercel stability
                    const minDelay = 1000;
                    const maxDelay = 2000;
                    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);

                    console.log(`Waiting ${delay}ms...`);
                    await wait(delay);

                    // 3. Reply using the configured auto-reply message from settings
                    const success = await sendPrivateReply(userId, settings.autoReply, isDM ? undefined : commentId);

                    if (success) {
                        console.log("Reply Sent Successfully.");
                        await updateActivityStatus(commentId, "sent", settings.autoReply);
                    } else {
                        await updateActivityStatus(commentId, "failed", "Reply failed to send");
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
        const bodyStr = JSON.stringify(body, null, 2);
        console.log("📥 WEBHOOK RECEIVED:", bodyStr);

        if (body.object === "instagram" || body.object === "page") {
            // VERCEL FIX: We MUST await this in serverless environments
            await processWebhookEvent(body);
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        } else {
            console.warn(`[Webhook] Ignored object type: ${body.object}`);
            return new NextResponse("Not Found", { status: 404 });
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
