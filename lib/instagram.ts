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
    const FB_PAGE_ID = process.env.FB_PAGE_ID || IG_BUSINESS_ACCOUNT_ID;

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
                publicError = data.error?.message || "Public reply error";
                console.warn("[IG] Public reply failed:", publicError);
            }
        } catch (e: any) {
            publicError = e.message;
        }
    }

    // 2. STRATEGY A: Official Private Reply (The "Private Reply" feature)
    if (commentId && dmReply) {
        console.log(`[IG] Trying Official Private Reply on ${commentId}...`);
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
                console.log("[IG] ✅ Official Private Reply OK");
                result.privateOk = true;
            } else {
                privateError = `Official Method: ${data.error?.message || JSON.stringify(data)}`;
                console.warn("[IG] Official Private Reply failed, trying fallback...");
            }
        } catch (e: any) {
            privateError = `Official Method Exception: ${e.message}`;
        }
    }

    // 3. STRATEGY B: General Messaging Fallback (Requires interaction history usually)
    // We try two different base IDs: The IG Business ID and the Page ID
    if (!result.privateOk && recipientIgsid && dmReply) {
        const potentialBaseIds = [IG_BUSINESS_ACCOUNT_ID, FB_PAGE_ID];

        for (const baseId of potentialBaseIds) {
            if (!baseId || baseId === "undefined") continue;

            console.log(`[IG] Fallback DM attempt via base ID: ${baseId}...`);
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
        result.errorText = `Workflow Failed. Public: ${publicError} | DM: ${privateError}`;
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
