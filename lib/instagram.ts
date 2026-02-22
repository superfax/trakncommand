const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.FB_IG_BUSINESS_ID || "17841480450586346";

export async function likeComment(commentId: string): Promise<boolean> {
    if (!ACCESS_TOKEN || !commentId) return false;

    try {
        console.log(`[IG] Liking comment ${commentId}...`);
        const res = await fetch(
            `https://graph.facebook.com/v19.0/${commentId}/likes?access_token=${ACCESS_TOKEN}`,
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

/**
 * Reply to an Instagram comment publicly using the configured auto-reply message.
 * Primary strategy: POST /{ig-comment-id}/replies (needs instagram_manage_comments only)
 * Fallback: Direct DM via messages API (needs Advanced Access)
 *
 * @param recipientIgsid - IGSID from webhook value.from.id
 * @param replyText      - The configured auto-reply message from settings
 * @param commentId      - The IG comment ID to reply to publicly
 */
export async function sendPrivateReply(
    recipientIgsid: string,
    replyText: string,
    commentId?: string
): Promise<boolean> {
    if (!ACCESS_TOKEN) {
        console.error("[IG] Missing FB_ACCESS_TOKEN");
        return false;
    }

    // Strategy 1: Public comment reply (works with instagram_manage_comments)
    if (commentId) {
        console.log(`[IG] Replying to comment ${commentId} with: "${replyText}"`);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v19.0/${commentId}/replies?access_token=${ACCESS_TOKEN}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: replyText })
                }
            );
            const data = await res.json();
            if (!data.error && (data.id || data.success)) {
                console.log("[IG] ✅ Public comment reply sent! ID:", data.id);
                return true;
            }
            console.warn("[IG] Public reply failed:", JSON.stringify(data.error || data));
        } catch (e) {
            console.error("[IG] Public reply threw:", e);
        }
    }

    // Strategy 2: Direct DM via IGSID (requires Advanced Access)
    if (recipientIgsid) {
        console.log(`[IG] Attempting DM to IGSID ${recipientIgsid}...`);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v19.0/${IG_BUSINESS_ACCOUNT_ID}/messages?access_token=${ACCESS_TOKEN}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipient: { id: recipientIgsid },
                        message: { text: replyText }
                    })
                }
            );
            const data = await res.json();
            if (!data.error) {
                console.log("[IG] ✅ DM sent via IGSID:", data.message_id);
                return true;
            }
            console.error("[IG] DM failed (needs Advanced Access):", JSON.stringify(data.error));
        } catch (e) {
            console.error("[IG] DM threw:", e);
        }
    }

    console.error("[IG] ❌ All reply strategies failed");
    return false;
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
            `https://graph.facebook.com/v19.0/${commentId}/replies?access_token=${ACCESS_TOKEN}`,
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
