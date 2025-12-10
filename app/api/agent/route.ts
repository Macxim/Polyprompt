import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "../../../lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { name, persona, description, history } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        { error: "No history provided" },
        { status: 400 }
      );
    }

    // Call Groq agent
    const agentResponse = await runAgent(name, persona, description, history);

    return NextResponse.json({ content: agentResponse });
  } catch (err) {
    console.error("Agent API error:", err);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
