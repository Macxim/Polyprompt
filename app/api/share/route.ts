import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";
import { SharedConversation, Agent } from "../../types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { conversation, agents } = body;

    if (!conversation) {
      return NextResponse.json({ error: "Missing conversation data" }, { status: 400 });
    }

    // Generate a secure random ID
    const shareId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    // De-normalize agent data so the public page knows who is speaking
    // If agents were passed, we use them; otherwise we'll have to rely on what's in the conversation
    const sharedData: SharedConversation & { agents?: Agent[] } = {
      ...conversation,
      shareId,
      sharedAt: Date.now(),
      agents: agents || [], // Snapshot of relevant agents
    };

    // Save to Redis (no expiration for persistent links, or set a long one)
    await redis.set(`share:${shareId}`, JSON.stringify(sharedData));

    return NextResponse.json({ shareId });
  } catch (error) {
    console.error("Share API Error:", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing share ID" }, { status: 400 });
    }

    try {
        const data = await redis.get(`share:${id}`);
        if (!data) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch shared link" }, { status: 500 });
    }
}
