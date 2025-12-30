import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keys, getUserData, setUserData } from "@/lib/redis";
import { DEFAULT_AGENTS } from "@/app/data/defaultAgents";
import { Agent } from "@/app/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.agents(userId);
  let agents = await getUserData<Agent>(key);

  // Seed default agents if none exist
  if (agents.length === 0) {
    agents = DEFAULT_AGENTS;
    await setUserData(key, agents);
  }

  return NextResponse.json(agents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.agents(userId);
  const body = await req.json();

  if (Array.isArray(body)) {
    // Bulk update (e.g., during migration)
    await setUserData(key, body);
    return NextResponse.json(body);
  } else {
    // Single agent update
    const agents = await getUserData<Agent>(key);
    const updatedAgent = body as Agent;
    const index = agents.findIndex((a) => a.id === updatedAgent.id);

    if (index > -1) {
      agents[index] = updatedAgent;
    } else {
      agents.push(updatedAgent);
    }

    await setUserData(key, agents);
    return NextResponse.json(updatedAgent);
  }
}
