import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !cseId) {
        return NextResponse.json(
            { error: "Server configuration error: Missing Google API keys" },
            { status: 500 }
        );
    }

    try {
        const res = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(
                query
            )}`
        );

        const data = await res.json();

        if (!res.ok) {
            console.error("Google API Error:", data);
            return NextResponse.json(
                { error: data.error?.message || "Google Search API failed" },
                { status: res.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Search Handler Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
