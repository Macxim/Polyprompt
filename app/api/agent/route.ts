import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "../../../lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { persona, content } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    // Call Groq agent
    const agentResponse = await runAgent(persona, content);

    return NextResponse.json({ content: agentResponse });
  } catch (err) {
    console.error("Agent API error:", err);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
