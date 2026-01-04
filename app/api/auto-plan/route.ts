import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, agents } = await req.json();

    // Get user-specific or system API key (admin only)
    const apiKey = await getApiKeyForUser(session.user.id, session.user.email || undefined);

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "API Key Required",
        message: "Please add your OpenAI API key in Settings to use this feature."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const openai = new OpenAI({ apiKey });

    if (!prompt || !agents || agents.length === 0) {
      return NextResponse.json({ error: "Missing prompt or agents" }, { status: 400 });
    }

    // System prompt to orchestrate the discussion as a Lean Debate Director
    const systemPrompt = `You are the "Lean Debate Director". Your goal is to orchestrate a high-speed, high-impact 5-turn debate.

User's Question: "${prompt}"

Available Agents:
${agents.map((a: any) => `- ID: ${a.id}, Name: ${a.name}, Persona: ${a.persona}`).join('\n')}

Required Structure (EXACTLY 5 TURNS):
1. Round 1: OPENING (Turns 1-2): Two different agents state their core case for opposite sides.
2. Round 2: REBUTTAL (Turns 3-4): The same two agents respond to each other's points.
3. Round 3: SYNTHESIS (Turn 5): A neutral, actionable wrap-up.

Director Guidelines:
- IDENTIFY OPTIONS: Extract exactly 2 core options from the question.
- ASSIGN SIDES: Ensure Agent A defends Option 1 and Agent B defends Option 2 consistently.
- BREVITY: Instruct agents to keep responses to 100 words max.
- CONSISTENCY: An agent MUST NOT switch sides.

Output JSON Format:
{
  "options": ["Option A", "Option B"],
  "plan": [
    {
      "round": 1,
      "phase": "OPENING",
      "agentId": "agent_id",
      "targetPosition": "Option A",
      "instruction": "State your 100-word opening case for Option A. Be punchy.",
      "type": "discussion"
    },
    ...
    {
      "round": 3,
      "phase": "SYNTHESIS",
      "agentId": "agent_id",
      "targetPosition": null,
      "instruction": "Summarize tradeoffs in under 150 words.",
      "type": "summary"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Plan the debate." }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    let data;
    try {
      data = JSON.parse(content || "{}");
      // Basic validation
      if (!data.options || !data.plan) throw new Error("Missing options or plan");
    } catch (e) {
      console.error("Failed to parse plan JSON", content);
      return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Auto-plan API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
