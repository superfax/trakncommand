const apiKey = "AIzaSyBfyFWupJ57IJ8GmZB0_mWHosZaCHj6pL4";
const cseId = "53d5478f895574213";
const query = "test";

async function testGoogleAPI() {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;

    console.log("Testing Google Custom Search API...");
    console.log("URL:", url);

    try {
        const res = await fetch(url);
        const data = await res.json();

        console.log("\nStatus:", res.status);
        console.log("\nResponse:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.log("\n❌ ERROR:", data.error.message);
            console.log("Error details:", data.error);
        } else {
            console.log("\n✅ SUCCESS! Found", data.searchInformation?.totalResults, "results");
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testGoogleAPI();
