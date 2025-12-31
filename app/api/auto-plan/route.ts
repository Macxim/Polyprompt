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

    const { prompt, agents, mode } = await req.json();

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

    // Determine number of rounds based on mode
    // Quick: 1 round + synthesis (approx 3-4 turns)
    // Deep: 2 rounds + synthesis (approx 6-8 turns)
    const rounds = mode === 'deep' ? 2 : 1;

    // System prompt to orchestrate the discussion
    const systemPrompt = `You are an expert conversation orchestrator and debate moderator.
Your goal is to plan a multi-turn discussion between AI agents to thoroughly analyze a user's topic.

User Topic: "${prompt}"

Available Agents:
${agents.map((a: any) => `- ID: ${a.id}, Name: ${a.name}, Persona: ${a.persona}`).join('\n')}

Plan a discussion with the following structure:
1. Select 2-3 most relevant agents from the list to discuss this topic.
2. If the user's topic implies a specific role not present, select the "most adaptable" agent but instruct them to adopt that perspective.
3. Create a step-by-step conversation plan.
4. Each step must have:
   - "agentId": The ID of the agent to speak.
   - "instruction": Specific instruction for what this agent should focus on in this turn.
   - "type": Either "discussion" (normal turn) or "summary" (final synthesis).

For "quick" mode, plan roughly ${rounds * agents.length} turns plus a final synthesis.
For "deep" mode, allow for back-and-forth debate.
The FINAL step MUST have "type": "summary". Do NOT include any other "summary" steps.

Return ONLY the JSON array of steps. No markdown formatting.
Example format:
[
  { "agentId": "agent_123", "instruction": "...", "type": "discussion" },
  { "agentId": "agent_456", "instruction": "...", "type": "summary" }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Plan the discussion." }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;

    // Clean up markdown code blocks if present
    const cleanContent = content?.replace(/```json/g, '').replace(/```/g, '').trim();

    let plan;
    try {
      plan = JSON.parse(cleanContent || "[]");
    } catch (e) {
      console.error("Failed to parse plan JSON", content);
      return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
    }

    return NextResponse.json({ plan });

  } catch (error: any) {
    console.error("Auto-plan API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
