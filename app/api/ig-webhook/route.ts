import { NextRequest, NextResponse } from "next/server";
import { appendFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getServerSettings } from "@/lib/serverStorage";
import { serverSaveLead, serverHasContactedUser, serverLogActivity, serverUpdateActivityStatus, serverUpdateLeadStatus } from "@/lib/serverStorage";
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
        const settings = await getServerSettings();
        console.log(`[Webhook] Settings Loaded: Online = ${settings.isSystemOnline}, Keyword = "${settings.keyword}"`);

        // Safety Check 1: Master Toggle
        if (!settings.isSystemOnline) {
            console.log("⚠️ WEBHOOK IGNORED: System is OFFLINE in Supabase Settings.");
            return;
        }

        const triggerKeyword = settings.keyword;

        // Build the list of keyword rules based on mode
        type MatchedRule = { keyword: string; dmReply: string; autoReply: string; followUpDm?: string };
        let activeRules: MatchedRule[];

        if (settings.keywordMode === "multi" && settings.keywordRules.length > 0) {
            activeRules = settings.keywordRules;
            console.log(`[Webhook] Multi-keyword mode: ${activeRules.length} rules active`);
        } else if (settings.keywordMode === "any") {
            activeRules = [{
                keyword: "ANY",
                dmReply: settings.dmReply,
                autoReply: "",
                followUpDm: settings.followUpDm,
            }];
            console.log(`[Webhook] Any-keyword mode active`);
        } else {
            activeRules = [{
                keyword: triggerKeyword,
                dmReply: settings.dmReply,
                autoReply: settings.autoReply,
                followUpDm: settings.followUpDm,
            }];
            console.log(`[Webhook] Single-keyword mode: "${triggerKeyword}"`);
        }

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
                        const username = (from.username || from.name || `User_${from.id?.toString().slice(-4)}`).trim();
                        interactions.push({
                            userId: from.id,
                            username,
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
                const selfHandles = ["traknpro"];
                const isSelf = selfHandles.includes(username.toLowerCase()) ||
                    commentText === settings.autoReply;

                if (isSelf) {
                    console.log(`⏭️ Ignoring self - interaction from ${username} `);
                    continue;
                }

                console.log(`[Webhook] Receipt: ${username} said "${commentText}"`);

                // Log initial receipt
                await serverLogActivity({
                    id: `rx-${Date.now()}-${username}`,
                    handle: username,
                    comment: isDM ? `📩 (DM): ${commentText}` : commentText,
                    status: "pending",
                    timestamp: new Date().toLocaleTimeString(),
                    postImage: media.media_url,
                    postCaption: media.caption,
                    commentId: parentId || commentId,
                    userId,
                });

                // Keyword Trigger Check — find first matching rule
                const matchedRule = settings.keywordMode === "any" ? activeRules[0] : activeRules.find(rule =>
                    commentText.toUpperCase().includes(rule.keyword.toUpperCase())
                );

                if (matchedRule) {
                    console.log(`🎯 Keyword Match: "${matchedRule.keyword}" found in "${commentText}"`);

                    // 🔍 Smart Cooldown Check
                    const { contacted, isInCooldown } = await serverHasContactedUser(userId, settings.cooldownHours);
                    if (contacted && isInCooldown) {
                        console.log(`⏰ User ${username} is in cooldown. Skipping.`);
                        continue;
                    }

                    // Pick the right DM: follow-up if returning, initial if first time
                    const isFollowUp = contacted && !isInCooldown;
                    const dmToSend = isFollowUp && matchedRule.followUpDm
                        ? matchedRule.followUpDm
                        : matchedRule.dmReply;

                    console.log(`[Webhook] ${isFollowUp ? "🔄 Follow-up" : "🆕 Initial"} DM for ${username} (rule: "${matchedRule.keyword}")`);

                    console.log("Keyword Matched! Initiating workflow...");

                    // Humanization 1: Like the comment immediately (Only for non-DMs)
                    if (!isDM) {
                        await likeComment(commentId);
                    }

                    // Simulate AI Tagging
                    const potentialTags = ["VIP", "High Value", "Early Access", "Influencer"];
                    const randomTag = potentialTags[Math.floor(Math.random() * potentialTags.length)];

                    // 1. Save Lead (Mark as contacted)
                    await serverSaveLead({
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

                    // 🛠️ ADVANCED PERSONALIZATION
                    const personalize = (text: string) => {
                        let msg = text;
                        // Replace macros
                        msg = msg.replace(/\[USERNAME\]/gi, username);
                        msg = msg.replace(/\[HANDLE\]/gi, username);

                        // Spintax support: {Option A|Option B|Option C}
                        msg = msg.replace(/\{([^{}]+)\}/g, (match, contents) => {
                            const options = contents.split('|');
                            return options[Math.floor(Math.random() * options.length)];
                        });

                        // Macro rotation support: [RANDOM_MACRO]
                        if (msg.includes("[RANDOM_MACRO]") && settings.macros && settings.macros.length > 0) {
                            const randomMacro = settings.macros[Math.floor(Math.random() * settings.macros.length)];
                            msg = msg.replace(/\[RANDOM_MACRO\]/gi, randomMacro.text);
                        }

                        // If it doesn't already start with @mention, prepend it for public replies
                        if (!isDM && !msg.startsWith("@") && !msg.includes(username)) {
                            msg = `@${username} ${msg}`;
                        }
                        return msg;
                    };

                    const finalPublicReply = matchedRule.autoReply ? personalize(matchedRule.autoReply) : "";
                    const finalDmReply = personalize(dmToSend);

                    console.log(`[Webhook] Prepared Replies for ${username} - Public: "${finalPublicReply.slice(0, 20)}...", DM: "${finalDmReply.slice(0, 20)}..."`);

                    // 4. Send the personalized replies
                    const result = await sendPrivateReply(
                        userId,
                        finalPublicReply,
                        finalDmReply,
                        isDM ? undefined : commentId
                    );

                    if (result.success) {
                        console.log("Automation Sequence Successful.");

                        // Construct status label
                        let statusText = "";
                        if (isDM) {
                            statusText = result.privateOk ? `📩 DM Sent: "${finalDmReply}"` : `❌ DM Failed: ${result.errorText} `;
                        } else {
                            const cStatus = result.publicOk ? "💬 Comment ✅" : "💬 Comment ❌";
                            const dStatus = result.privateOk ? "📩 DM ✅" : "📩 DM ❌";
                            statusText = `${cStatus} | ${dStatus} `;

                            // If DM failed, show the link we tried to send
                            if (!result.privateOk) {
                                statusText += ` (Err: ${result.errorText})`;
                            } else {
                                statusText += ` | DM: "${finalDmReply}"`;
                            }
                        }

                        await serverUpdateActivityStatus(commentId, result.privateOk ? "sent" : "partial", statusText);

                        // Auto-advance lead status to "contacted" when DM sends successfully
                        if (result.privateOk) {
                            await serverUpdateLeadStatus(userId, "contacted");
                        }
                    } else {
                        await serverUpdateActivityStatus(commentId, "failed", `Workflow Failed: ${result.errorText || "Unknown Meta Error"} `);
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

        // --- DIAGNOSTIC LOGGING ---
        try {
            const logPath = join(process.cwd(), "data", "last_webhook.json");
            writeFileSync(logPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                body
            }, null, 2));
            console.log("[DEBUG] Webhook payload saved to data/last_webhook.json");
        } catch (e) {
            console.error("[DEBUG] Failed to save webhook log:", e);
        }
        // ---------------------------

        const bodyStr = JSON.stringify(body, null, 2);
        console.log("📥 WEBHOOK RECEIVED:", bodyStr);

        if (body.object === "instagram" || body.object === "page") {
            // VERCEL FIX: We MUST await this in serverless environments
            await processWebhookEvent(body);
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        } else {
            console.warn(`[Webhook] Ignored object type: ${body.object} `);
            return new NextResponse("Not Found", { status: 404 });
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
