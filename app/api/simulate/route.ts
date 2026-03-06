import { NextRequest, NextResponse } from "next/server";
import { getServerSettings, serverLogActivity, serverSaveLead, serverHasContactedUser, serverUpdateActivityStatus } from "@/lib/serverStorage";

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
        const settings = await getServerSettings();

        const handle = body.handle || TEST_HANDLES[Math.floor(Math.random() * TEST_HANDLES.length)];
        const suffix = TEST_COMMENTS_SUFFIX[Math.floor(Math.random() * TEST_COMMENTS_SUFFIX.length)];
        const keyword = settings.keyword || "PRO";
        const commentText = `${suffix} ${keyword}`;
        const fakeUserId = `sim_${Date.now()}`;
        const fakeCommentId = `cmt_${Date.now()}`;

        // Log initial receipt (same as real webhook)
        await serverLogActivity({
            id: `rx-${Date.now()}`,
            handle,
            comment: commentText,
            status: "pending",
            timestamp: new Date().toLocaleTimeString(),
            postCaption: `Simulated comment trigger · keyword: ${keyword}`,
            commentId: fakeCommentId,
        });

        if (!settings.isSystemOnline) {
            return NextResponse.json({ ok: false, reason: "System is OFFLINE" });
        }

        // Run automation in background (fire-and-forget)
        (async () => {
            try {
                const alreadyContacted = await serverHasContactedUser(fakeUserId);
                if (alreadyContacted) return;

                await likeComment(fakeCommentId);

                const potentialTags = ["VIP", "High Value", "Early Access", "Influencer"];
                const randomTag = potentialTags[Math.floor(Math.random() * potentialTags.length)];

                await serverSaveLead({
                    id: fakeUserId,
                    handle,
                    timestamp: new Date().toISOString(),
                    status: "new",
                    tags: [randomTag],
                });

                const delay = Math.floor(Math.random() * 10000) + 3000; // 3-13s for simulation
                await wait(delay);

                const personalize = (text: string) => {
                    let msg = text;
                    msg = msg.replace(/\[USERNAME\]/gi, handle);
                    msg = msg.replace(/\[HANDLE\]/gi, handle);

                    msg = msg.replace(/\{([^{}]+)\}/g, (match, contents) => {
                        const options = contents.split('|');
                        return options[Math.floor(Math.random() * options.length)];
                    });

                    if (msg.includes("[RANDOM_MACRO]") && settings.macros && settings.macros.length > 0) {
                        const randomMacro = settings.macros[Math.floor(Math.random() * settings.macros.length)];
                        msg = msg.replace(/\[RANDOM_MACRO\]/gi, randomMacro.text);
                    }
                    return msg;
                };

                const finalPublicReply = personalize(settings.autoReply);
                const finalDmReply = personalize(settings.dmReply);

                const success = await sendPrivateReply(fakeUserId, finalPublicReply, finalDmReply);

                const statusText = success ? `💬 Comment ✅ | 📩 DM ✅ | DM: "${finalDmReply}"` : "Simulated DM failed";
                await serverUpdateActivityStatus(fakeCommentId, success ? "sent" : "failed", statusText);
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
