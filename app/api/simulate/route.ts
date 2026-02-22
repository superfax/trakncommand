import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { logActivity, saveLead, hasContactedUser } from "@/lib/storage";

export const dynamic = 'force-dynamic';
import { likeComment, sendPrivateReply, wait } from "@/lib/instagram";

const TEST_HANDLES = ["dj_nova", "beatmaster99", "producer_vibe", "lowkeyartist", "thekid_wavey"];
const TEST_COMMENTS_SUFFIX = [
    "bro this is exactly what I needed!!",
    "omg this is fire 🔥",
    "been looking for something like this",
    "where do I sign up?",
    "this is crazy how didn't I know about this",
];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const settings = await getSettings();

        const handle = body.handle || TEST_HANDLES[Math.floor(Math.random() * TEST_HANDLES.length)];
        const suffix = TEST_COMMENTS_SUFFIX[Math.floor(Math.random() * TEST_COMMENTS_SUFFIX.length)];
        const keyword = settings.keyword || "PRO";
        const commentText = `${suffix} ${keyword}`;
        const fakeUserId = `sim_${Date.now()}`;
        const fakeCommentId = `cmt_${Date.now()}`;

        // Log initial receipt (same as real webhook)
        await logActivity({
            id: `rx-${Date.now()}`,
            handle,
            comment: commentText,
            status: "pending",
            timestamp: new Date().toLocaleTimeString(),
            postCaption: `Simulated comment trigger · keyword: ${keyword}`,
        });

        if (!settings.isSystemOnline) {
            return NextResponse.json({ ok: false, reason: "System is OFFLINE" });
        }

        // Run automation in background (fire-and-forget)
        (async () => {
            try {
                const alreadyContacted = await hasContactedUser(fakeUserId);
                if (alreadyContacted) return;

                await likeComment(fakeCommentId);

                const potentialTags = ["VIP", "High Value", "Early Access", "Influencer"];
                const randomTag = potentialTags[Math.floor(Math.random() * potentialTags.length)];

                await saveLead({
                    id: fakeUserId,
                    handle,
                    timestamp: new Date().toISOString(),
                    status: "new",
                    tags: [randomTag],
                });

                const delay = Math.floor(Math.random() * 10000) + 3000; // 3-13s for simulation
                await wait(delay);

                const success = await sendPrivateReply(fakeUserId, "https://trakn.pro/early-access");

                await logActivity({
                    id: `${success ? "sent" : "fail"}-${Date.now()}`,
                    handle,
                    comment: success ? "DM Sent via simulation" : "Simulated DM failed (no token — expected)",
                    status: success ? "sent" : "failed",
                    timestamp: new Date().toLocaleTimeString(),
                });
            } catch (e) {
                console.error("[Simulate] Background error:", e);
            }
        })();

        return NextResponse.json({ ok: true, handle, comment: commentText });
    } catch (error) {
        console.error("[Simulate] Error:", error);
        return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
    }
}
