import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keys, getUserData, setUserData } from "@/lib/redis";
import { Conversation } from "@/app/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.conversations(userId);
  const conversations = await getUserData<Conversation>(key);

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.conversations(userId);
  const body = await req.json();

  if (Array.isArray(body)) {
    // Bulk update (e.g., during migration or sync)
    await setUserData(key, body);
    return NextResponse.json(body);
  } else {
    // Single conversation update
    const conversations = await getUserData<Conversation>(key);
    const updatedConversation = body as Conversation;
    const index = conversations.findIndex((c) => c.id === updatedConversation.id);

    if (index > -1) {
      conversations[index] = updatedConversation;
    } else {
      conversations.push(updatedConversation);
    }

    await setUserData(key, conversations);
    return NextResponse.json(updatedConversation);
  }
}
