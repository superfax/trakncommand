
async function verify() {
    try {
        const res = await fetch("http://localhost:3000/api/ig-webhook?hub.mode=subscribe&hub.verify_token=TRAKN_COMMAND_V1&hub.challenge=12345");
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("BODY:", text);
    } catch (e) {
        console.error(e);
    }
}
verify();
