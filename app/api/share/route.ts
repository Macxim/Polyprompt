import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { SharedConversation } from "../../types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { conversation } = body;

    if (!conversation) {
      return NextResponse.json({ error: "Missing conversation data" }, { status: 400 });
    }

    // Generate a secure random ID (or just a timestamp-random mix)
    const shareId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const sharedData: SharedConversation = {
      ...conversation,
      shareId,
      sharedAt: Date.now(),
    };

    // Save to KV with 30-day expiration (optional, or permanent)
    // In production, we assume KV_URL and specific env vars are set.
    // Locally, this will fail if not connected, so we should handle that gracefully or mock it?
    // User goal is production deployment, so we write real code.

    // Check if KV is configured
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
         // Fallback for local testing without "vercel link"
         // warn user in response
         console.warn("KV Environment variables missing. Sharing will fail.");
         // return NextResponse.json({ error: "Database not configured. Please deploy to Vercel." }, { status: 500 });
         // Actually, let's just let it fail naturally or return mock in dev?
         // User wants production.
    }

    await kv.set(`share:${shareId}`, sharedData);
    // await kv.expire(`share:${shareId}`, 60 * 60 * 24 * 30); // 30 days

    return NextResponse.json({ shareId });
  } catch (error) {
    console.error("Share API Error:", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    // This route might arguably not be needed if we fetch in the Page Component via Server Components usage of `kv`.
    // But having an API is flexible.
    return NextResponse.json({ msg: "Use server components to fetch" });
}
