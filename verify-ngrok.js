
async function verify() {
    try {
        const publicUrl = "https://alysha-untroublesome-uncontiguously.ngrok-free.dev";
        console.log("TUNNEL URL:", publicUrl);

        const res = await fetch(`${publicUrl}/api/ig-webhook?hub.mode=subscribe&hub.verify_token=TRAKN_COMMAND_V1&hub.challenge=12345`);
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("BODY START:", text.substring(0, 500));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
verify();
