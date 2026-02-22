const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.FB_IG_BUSINESS_ID || "17841480450586346";

export async function likeComment(commentId: string): Promise<boolean> {
    if (!ACCESS_TOKEN || !commentId) return false;

    try {
        console.log(`[IG] Liking comment ${commentId}...`);
        const res = await fetch(
            `https://graph.facebook.com/v24.0/${commentId}/likes?access_token=${ACCESS_TOKEN}`,
            { method: "POST" }
        );
        const data = await res.json();
        if (data.error) {
            console.error("[IG] Like failed:", JSON.stringify(data.error));
            return false;
        }
        console.log("[IG] Comment liked ✅");
        return true;
    } catch (error) {
        console.error("[IG] Error liking comment:", error);
        return false;
    }
}

export interface ReplyResponse {
    success: boolean;
    publicOk: boolean;
    privateOk: boolean;
    errorText?: string;
}

/**
 * Reply to an Instagram comment publicly AND send a direct DM.
 *
 * @param recipientIgsid - IGSID/PSID from webhook
 * @param commentReply   - The public teaser
 * @param dmReply        - The private content
 * @param commentId      - The ID of the comment being replied to
 */
export async function sendPrivateReply(
    recipientIgsid: string,
    commentReply: string,
    dmReply: string,
    commentId?: string
): Promise<ReplyResponse> {
    const FB_PAGE_ID = process.env.FB_PAGE_ID;
    const IG_BIZ_ID = process.env.FB_IG_BUSINESS_ID || IG_BUSINESS_ACCOUNT_ID;

    if (!ACCESS_TOKEN) {
        console.error("[IG] Missing FB_ACCESS_TOKEN");
        return { success: false, publicOk: false, privateOk: false, errorText: "Missing Access Token" };
    }

    const result: ReplyResponse = {
        success: false,
        publicOk: false,
        privateOk: false
    };

    let publicError = "";
    let privateError = "";

    // 1. PUBLIC COMMENT REPLY
    if (commentId && commentReply) {
        console.log(`[IG] Public Reply to ${commentId}...`);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v24.0/${commentId}/replies?access_token=${ACCESS_TOKEN}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: commentReply })
                }
            );
            const data = await res.json();
            if (!data.error && (data.id || data.success)) {
                console.log("[IG] ✅ Public comment OK");
                result.publicOk = true;
            } else {
                publicError = data.error?.message || JSON.stringify(data);
                console.warn("[IG] Public reply failed:", publicError);
            }
        } catch (e: any) {
            publicError = e.message;
        }
    }

    // 2. STRATEGY A: Official Modern Private Reply (per Meta Docs)
    // Endpoint: IG_BIZ_ID/messages
    // Body: { recipient: { comment_id: ... }, message: { text: ... } }
    if (commentId && dmReply && IG_BIZ_ID) {
        console.log(`[IG] Trying Modern Private Reply via ${IG_BIZ_ID}...`);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v24.0/${IG_BIZ_ID}/messages?access_token=${ACCESS_TOKEN}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipient: { comment_id: commentId },
                        message: { text: dmReply }
                    })
                }
            );
            const data = await res.json();
            if (!data.error && (data.id || data.success || data.message_id)) {
                console.log("[IG] ✅ Modern Private Reply OK");
                result.privateOk = true;
            } else {
                const err = data.error?.message || JSON.stringify(data);
                privateError = `Modern: ${err}`;
                console.warn("[IG] Modern Private Reply failed:", err);
            }
        } catch (e: any) {
            privateError = `Modern Method Exception: ${e.message}`;
        }
    }

    // 2b. STRATEGY A2: Legacy Private Reply Fallback
    if (!result.privateOk && commentId && dmReply) {
        console.log(`[IG] Trying Legacy Private Reply on ${commentId}...`);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v24.0/${commentId}/private_replies?access_token=${ACCESS_TOKEN}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: dmReply })
                }
            );
            const data = await res.json();
            if (!data.error && (data.id || data.success)) {
                console.log("[IG] ✅ Legacy Private Reply OK");
                result.privateOk = true;
            } else {
                const err = data.error?.message || JSON.stringify(data);
                privateError += ` | Legacy: ${err}`;
            }
        } catch (e: any) {
            privateError += ` | Legacy Exception: ${e.message}`;
        }
    }

    // 3. STRATEGY B: General Messaging Fallback
    if (!result.privateOk && recipientIgsid && dmReply) {
        const potentialBaseIds = [IG_BIZ_ID, FB_PAGE_ID].filter(id => id && id !== "undefined");

        for (const baseId of potentialBaseIds) {
            console.log(`[IG] Fallback DM attempt via ${baseId}...`);
            try {
                const res = await fetch(
                    `https://graph.facebook.com/v24.0/${baseId}/messages?access_token=${ACCESS_TOKEN}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            recipient: { id: recipientIgsid },
                            message: { text: dmReply }
                        })
                    }
                );
                const data = await res.json();
                if (!data.error) {
                    console.log(`[IG] ✅ Fallback DM OK (via ${baseId})`);
                    result.privateOk = true;
                    break;
                } else {
                    const fallbackError = data.error?.message || JSON.stringify(data);
                    console.warn(`[IG] Fallback via ${baseId} failed:`, fallbackError);
                    privateError += ` | Fallback (${baseId}): ${fallbackError}`;
                }
            } catch (e: any) {
                console.error(`[IG] Fallback via ${baseId} threw:`, e.message);
            }
        }
    }

    result.success = result.publicOk || result.privateOk;

    if (!result.success) {
        result.errorText = `Failed. Public: ${publicError || "N/A"} | DM: ${privateError || "N/A"}`;
    } else if (!result.privateOk) {
        result.errorText = `DM FAILED: ${privateError}`;
    } else if (!result.publicOk) {
        result.errorText = `COMMENT FAILED: ${publicError}`;
    }

    return result;
}

/**
 * Send a manual reply to a specific comment (used by /api/reply route)
 */
export async function replyToComment(commentId: string, message: string): Promise<boolean> {
    if (!ACCESS_TOKEN || !commentId) {
        console.error("[IG] replyToComment: missing token or commentId");
        return false;
    }
    try {
        const res = await fetch(
            `https://graph.facebook.com/v25.0/${commentId}/replies?access_token=${ACCESS_TOKEN}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            }
        );
        const data = await res.json();
        if (!data.error && (data.id || data.success)) {
            console.log("[IG] ✅ Manual reply sent:", data.id);
            return true;
        }
        console.error("[IG] Manual reply failed:", JSON.stringify(data.error || data));
        return false;
    } catch (e) {
        console.error("[IG] Manual reply threw:", e);
        return false;
    }
}

export function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
