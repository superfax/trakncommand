import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { getSettings } from "@/lib/settings";
import { saveLead, logActivity, updateActivityStatus } from "@/lib/storage";
import { sendPrivateReply, likeComment, wait } from "@/lib/instagram";

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "TRAKN_COMMAND_V1";

// 🛡️ RECURSION SHIELD: BIGINT-SAFE IDENTITY CHECK
// JavaScript mangles long Meta IDs (17 digits) if parsed as Numbers.
// We use regex on the raw text in the POST handler for absolute safety.
function isShieldedBot(val: any): boolean {
    if (!val) return false;

    // Convert to string safely
    const id = String(val).trim();
    if (!id || id === "undefined" || id === "[object Object]") return false;

    // Suffix check is the most reliable fingerprint
    if (id.endsWith("6346") || id.endsWith("0268")) return true;

    // Exact matches
    const bizId = process.env.FB_IG_BUSINESS_ID || "17841480450586346";
    const pageId = process.env.FB_PAGE_ID || "945833891950268";
    if (id === bizId || id === pageId || id === "17841480450586346" || id === "945833891950268") return true;

    // Floating point mangling check
    if (id.startsWith("178414804505863") && (id.length >= 16)) return true;

    return false;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Forbidden", { status: 403 });
}

async function processWebhookEvent(body: any) {
    try {
        const settings = await getSettings();
        if (!settings.isSystemOnline) return;

        const triggerKeyword = settings.keyword.trim();

        for (const entry of body.entry) {
            // 🛡️ STANDBY PROTECTION (Handover Protocol)
            if (entry.standby) {
                console.log(`[Shield] Standby event ignored.`);
                continue;
            }

            const interactions: any[] = [];

            // 1. DMs (Direct Messaging)
            if (entry.messaging) {
                for (const msg of entry.messaging) {
                    const senderIdRaw = msg.sender?.id;
                    const recipientIdRaw = msg.recipient?.id;

                    // 🛡️ SENDER SHIELD: REJECT BOT ECHOES
                    if (isShieldedBot(senderIdRaw) || msg.message?.is_echo) {
                        console.log(`[Shield] Dropped DM Echo from Bot ${senderIdRaw}`);
                        continue;
                    }

                    // 🛡️ RECIPIENT SHIELD: MUST BE SENT TO THE BOT
                    if (!isShieldedBot(recipientIdRaw)) {
                        console.log(`[Shield] Dropped DM not addressed to bot (Recipient ${recipientIdRaw})`);
                        continue;
                    }

                    if (msg.message?.text) {
                        const sId = String(senderIdRaw);
                        interactions.push({
                            userId: sId,
                            username: `User_${sId.slice(-4)}`,
                            commentText: msg.message.text,
                            commentId: msg.message.mid,
                            isDM: true,
                            media: {},
                            rawSender: senderIdRaw,
                            rawRecipient: recipientIdRaw
                        });
                    }
                }
            }

            // 2. Comments (Feeds & Comments)
            if (entry.changes) {
                for (const change of entry.changes) {
                    const value = change.value;
                    if (!value || !value.from) continue;

                    // 🛡️ REJECT BOT COMMENTS
                    if (isShieldedBot(value.from.id)) {
                        console.log(`[Shield] Dropped Bot Comment from ${value.from.id}`);
                        continue;
                    }

                    const isComment = change.field === "comments" || (change.field === "feed" && value.item === "comment");
                    if (isComment) {
                        const sId = String(value.from.id);
                        const username = (value.from.username || value.from.name || `User_${sId.slice(-4)}`).trim();
                        interactions.push({
                            userId: sId,
                            username,
                            commentText: change.field === "feed" ? value.message : (value.text || ""),
                            commentId: change.field === "feed" ? value.comment_id : value.id,
                            parentId: value.parent_id,
                            media: value.media || {},
                            isDM: false,
                            rawSender: value.from.id
                        });
                    }
                }
            }

            // 3. Process Valid Interactions
            for (const item of interactions) {
                const { userId, username, commentText, commentId, isDM, rawSender, rawRecipient } = item;

                // 🛡️ RECURSION SHIELDS (v6 - Final Lockdown)
                const lowerText = (commentText || "").toLowerCase();
                const isRecursiveStr = lowerText.includes("exclusive access") ||
                    lowerText.includes("trakn.pro/access") ||
                    lowerText.includes("📩") ||
                    lowerText.includes("workflow") ||
                    lowerText.includes("replied") ||
                    lowerText.includes("trakn automator");

                const isBot = isShieldedBot(userId) || isShieldedBot(rawSender);

                if (isRecursiveStr || isBot) {
                    console.log(`🛑 [Shield] DROPPED. Bot=${isBot}, Recurse=${isRecursiveStr}. Content: ${commentText.slice(0, 30)}...`);
                    continue;
                }

                console.log(`[Webhook] Receipt: ${username} -> "${commentText}"`);

                await logActivity({
                    id: `rx-${Date.now()}-${username}`,
                    handle: username,
                    comment: isDM ? `📩 (DM): ${commentText}` : commentText,
                    status: "pending",
                    timestamp: new Date().toLocaleTimeString(),
                    postImage: item.media.media_url,
                    postCaption: item.media.caption,
                    commentId: item.parentId || commentId,
                    userId,
                });

                const keywordRegex = new RegExp(`\\b${triggerKeyword}\\b`, 'i');
                if (keywordRegex.test(commentText)) {
                    console.log(`🎯 Keyword Match!`);

                    if (!isDM) await likeComment(commentId);

                    await saveLead({
                        id: userId,
                        handle: username,
                        timestamp: new Date().toISOString(),
                        status: "new",
                        tags: ["Verified"]
                    });

                    await wait(1800);

                    const personalize = (text: string) => {
                        let msg = text.replace(/\[USERNAME\]/gi, username).replace(/\[HANDLE\]/gi, username);
                        if (!isDM && !msg.startsWith("@")) msg = `@${username} ${msg}`;
                        return msg;
                    };

                    const result = await sendPrivateReply(
                        userId,
                        personalize(settings.autoReply),
                        personalize(settings.dmReply),
                        isDM ? undefined : commentId
                    );

                    if (result.success) {
                        const label = isDM ? `📩 DM Sent` : `💬 Comment ✅ | 📩 DM ✅`;
                        await updateActivityStatus(commentId, result.privateOk ? "sent" : "partial", label);
                    } else {
                        // Diagnostic labels in activity failure
                        const diag = `S:${String(rawSender).slice(-4)} R:${String(rawRecipient || 'N/A').slice(-4)}`;
                        await updateActivityStatus(commentId, "failed", `Workflow Failed: ${result.errorText} (${diag})`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Critical Webhook Error:", error);
    }
}

export async function POST(req: NextRequest) {
    const dataDir = join(process.cwd(), "public", "logs");
    try {
        if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

        const rawText = await req.text();
        const timestamp = Date.now();

        // 1. AUDIT EVERYTHING (v5)
        writeFileSync(join(dataDir, `raw_${timestamp}.json`), rawText);

        // 2. IRON DOME v5 (UNCONDITIONAL SENDER REJECTION)
        // If the bot ID appears anywhere in a context that looks like a sender/from, NUKE IT.
        const botPatterns = ["178414804505863", "9458338919502", "6346", "0268"];
        const isSelf = botPatterns.some(p => {
            const regex = new RegExp(`"(sender|from)"\\s*:\\s*\\{[^}]*"id"\\s*:\\s*"?${p}`, "i");
            return regex.test(rawText);
        });

        if (isSelf) {
            console.log("🛑 [Iron Dome v5] Blocked Bot Echo at entrance.");
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        // 3. BIGINT-SAFE PRE-PARSING
        const cleanedBodyRaw = rawText.replace(/:(\s*)(\d{15,})/g, ':$1"$2"');
        const body = JSON.parse(cleanedBodyRaw);
        writeFileSync(join(dataDir, `parsed_${timestamp}.json`), JSON.stringify(body, null, 2));

        if (body.object === "instagram" || body.object === "page") {
            await processWebhookEvent(body);
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }
        return new NextResponse("Not Found", { status: 404 });
    } catch (error) {
        console.error("Webhook Internal Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
