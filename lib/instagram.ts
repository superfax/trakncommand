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
 * @param recipientIgsid - IGSID from webhook value.from.id
 * @param commentReply   - The public "teaser" message for the comment
 * @param dmReply        - The private "value" message for the DM
 * @param commentId      - The IG comment ID to reply to publicly
 */
export async function sendPrivateReply(
    recipientIgsid: string,
    commentReply: string,
    dmReply: string,
    commentId?: string
): Promise<ReplyResponse> {
    if (!ACCESS_TOKEN) {
        console.error("[IG] Missing FB_ACCESS_TOKEN");
        return { success: false, publicOk: false, privateOk: false, errorText: "Missing Access Token" };
    }

    const result: ReplyResponse = {
        success: false,
        publicOk: false,
        privateOk: false
    };

    let lastError = "";

    // Strategy 1: Public comment reply
    if (commentId && commentReply) {
        console.log(`[IG] Replying to comment ${commentId} with: "${commentReply}"`);
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
                console.log("[IG] ✅ Public comment reply sent!");
                result.publicOk = true;
            } else {
                const err = data.error?.message || JSON.stringify(data);
                console.warn("[IG] Public reply failed:", err);
                lastError = `Comment: ${err}`;
            }
        } catch (e: any) {
            console.error("[IG] Public reply threw:", e);
            lastError = `Comment Exception: ${e.message}`;
        }
    }

    // Strategy 2: Official Private Reply (Comment -> DM)
    if (commentId && dmReply) {
        console.log(`[IG] Attempting Official Private Reply for comment ${commentId}...`);
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

            // LOG THE FULL RESPONSE for debugging
            console.log(`[IG] Official Private Reply Response:`, JSON.stringify(data));

            if (!data.error && (data.id || data.success)) {
                console.log("[IG] ✅ Private Reply (DM) sent via official API!");
                result.privateOk = true;
            } else {
                const err = data.error?.message || JSON.stringify(data);
                console.warn("[IG] Official Private Reply failed:", err);
                lastError = `DM (Official): ${err}`;

                // Add specific Meta Debug Info to help the user
                if (data.error?.code === 10) lastError += " (Possible account restriction or business logic)";
                if (data.error?.code === 200) lastError += " (Permissions: instagram_manage_comments required)";
            }
        } catch (e: any) {
            console.error("[IG] Official Private Reply threw:", e);
            lastError = `DM Exception: ${e.message}`;
        }
    }

    // Strategy 3: Direct DM via IGSID (Fallback)
    if (!result.privateOk && recipientIgsid && dmReply) {
        console.log(`[IG] Falling back to Direct DM for IGSID ${recipientIgsid}... (Using ID: ${IG_BUSINESS_ACCOUNT_ID})`);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v24.0/${IG_BUSINESS_ACCOUNT_ID}/messages?access_token=${ACCESS_TOKEN}`,
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
            console.log(`[IG] Fallback DM Response:`, JSON.stringify(data));

            if (!data.error) {
                console.log("[IG] ✅ DM sent via general Messaging API:", data.message_id);
                result.privateOk = true;
            } else {
                const err = data.error?.message || JSON.stringify(data);
                console.error("[IG] Direct DM fallback failed:", err);
                // We keep the original error if it was a strategy 2 failure as it's more specific
                if (!lastError.includes("DM")) lastError = `DM (Fallback): ${err}`;
            }
        } catch (e: any) {
            console.error("[IG] Direct DM threw:", e);
        }
    }

    result.success = result.publicOk || result.privateOk;
    if (!result.success) {
        result.errorText = lastError;
    } else if (!result.publicOk || !result.privateOk) {
        result.errorText = `Partial Success: ${lastError}`;
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
