import { NextRequest, NextResponse } from "next/server";
import { serverLogActivity, serverGetActivities, serverUpdateActivityStatus } from "@/lib/serverStorage";

export const dynamic = 'force-dynamic';
import { replyToComment } from "@/lib/instagram";

export async function POST(req: NextRequest) {
    try {
        const { handle, message, activityId } = await req.json();

        // Find the original activity item to get the real commentId
        const activity = await serverGetActivities();
        const original = activityId
            ? activity.find((a) => a.id === activityId)
            : activity.find((a) => a.handle === handle && a.commentId);

        const commentId = original?.commentId;

        let success = false;

        if (commentId) {
            // Send real Instagram comment reply
            success = await replyToComment(commentId, message);
        } else {
            console.warn(`[Reply] No commentId found for handle @${handle} — logging only`);
        }

        if (success && commentId) {
            // Update the original activity item with the manual reply
            await serverUpdateActivityStatus(commentId, "sent", message);
        } else {
            // Fallback for situations where commentId isn't available
            await serverLogActivity({
                id: `reply-${Date.now()}`,
                handle: handle || "Unknown",
                comment: success
                    ? `✅ Replied: "${message}"`
                    : `📝 Logged (no commentId): "${message}"`,
                status: "sent",
                timestamp: new Date().toLocaleTimeString(),
            });
        }

        return NextResponse.json({ success: true, apiCalled: !!commentId, sent: success });
    } catch (error) {
        console.error("[Reply] Error:", error);
        return NextResponse.json({ error: "Failed to reply" }, { status: 500 });
    }
}
