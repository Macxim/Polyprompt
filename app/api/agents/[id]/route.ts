import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keys, getUserData, setUserData } from "@/lib/redis";
import { Agent } from "@/app/types";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.agents(userId);
  const { id } = await params;

  const agents = await getUserData<Agent>(key);
  const filteredAgents = agents.filter((a) => a.id !== id);

  await setUserData(key, filteredAgents);

  return NextResponse.json({ success: true });
}
