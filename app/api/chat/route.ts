import { OpenAI } from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";
import posthog from "@/lib/posthog";
import { keys, redis, ensureConnection } from "@/lib/redis";

export const runtime = "nodejs";

const DAILY_MESSAGE_LIMIT = 10;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await ensureConnection();

    const { messages, agent, conversationHistory, countAsUserMessage, debateTurn, targetPosition, options, round, phase, previousAgentStance, previousAgentName } = await req.json();

    // --- PHASE 2: BUDGET CHECK ---
    const BUDGET_LIMIT = 30.0;
    const currentSpendStr = await redis.get(keys.systemSpend);
    const currentSpend = parseFloat(currentSpendStr || "0");

    if (currentSpend >= BUDGET_LIMIT) {
      return new Response(JSON.stringify({
        error: "Monthly Budget Reached",
        message: "The system's OpenAI budget has been reached for this month. Please contact the administrator."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    // ----------------------------

    // Get user-specific or system API key
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

    // --- PHASE 3: RATE LIMITING (Free Tier Only) ---
    const isUsingSystemKey = apiKey === process.env.OPENAI_API_KEY;
    let isLimitReached = false;

    if (isUsingSystemKey) {
      const dailyKey = keys.userDailyMessages(session.user.id);
      const currentCountStr = await redis.get(dailyKey);
      const currentCount = parseInt(currentCountStr || "0", 10);

      if (countAsUserMessage) {
        if (currentCount >= DAILY_MESSAGE_LIMIT) {
          isLimitReached = true;
        } else {
          const newCount = await redis.incr(dailyKey);
          if (newCount === 1) {
            await redis.expire(dailyKey, 86400);
          }
        }
      } else {
        if (currentCount > DAILY_MESSAGE_LIMIT) {
          isLimitReached = true;
        }
      }

      if (isLimitReached) {
        return new Response(JSON.stringify({
          error: "Daily Limit Reached",
          message: `You've used all ${DAILY_MESSAGE_LIMIT} free messages for today. Add your own OpenAI API key in Settings for unlimited access.`,
          remainingMessages: 0
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    // ------------------------------------------------

    // Track message sent
    posthog.capture({
      distinctId: session.user.id,
      event: 'message_sent',
      properties: {
        agent_id: agent.id,
        agent_name: agent.name,
        model: agent.model || "gpt-4o-mini",
        message_length: messages[messages.length - 1].content.length,
        is_byok: !isUsingSystemKey,
        debate_turn: debateTurn,
        target_position: targetPosition
      }
    });

    const openai = new OpenAI({ apiKey });

    // Validate turn: Check if a response aligns with a position
    if (debateTurn === 'validate') {
      const contentToValidate = messages[messages.length - 1].content;
      const validationPrompt = `Is the following response arguing FOR "${targetPosition}" or AGAINST it?

STRICT RULES FOR VALIDITY:
1. It MUST defend "${targetPosition}" forcefully.
2. It MUST NOT concede that "${options?.find((o: string) => o !== targetPosition)}" has good points.
3. It MUST NOT be neutral, "balanced", or say "it depends".
4. If it starts by saying "${targetPosition}" is a mistake or flawed, it is INVALID.`;

      const check = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: validationPrompt },
          { role: "user", content: contentToValidate }
        ],
        response_format: { type: "json_object" }
      });

      return new Response(check.choices[0].message.content, {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate Synthesis: Check for bias and format
    if (debateTurn === 'validate-synthesis') {
      const contentToValidate = messages[messages.length - 1].content;
      const optA = options?.[0] || "Option A";
      const optB = options?.[1] || "Option B";

      const validationPrompt = `Evaluate this debate synthesis for neutrality and format.

Rules for VALID Synthesis:
1. NO SIDE-PICKING: It must not say one option is better, superior, or recommended.
2. FORMAT: It must contain "Choose ${optA} if:" and "Choose ${optB} if:".
3. BALANCE: It should provide equal weight to both sides.
4. NO ADVOCACY: Avoid phrases like "the best option is" or "clearly superior".

Respond with ONLY a JSON object:
{
  "isValid": true/false,
  "reason": "explanation of bias or format failure",
  "biasDetected": "A", "B", or "none"
}`;

      const check = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: validationPrompt },
          { role: "user", content: contentToValidate }
        ],
        response_format: { type: "json_object" }
      });

      return new Response(check.choices[0].message.content, {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Agent-specific rhetorical patterns
    const AGENT_STYLES: Record<string, string> = {
      'strategic_analyst': "Style: Professional, data-focused, uses mental models. Key phrases: 'The data suggests', 'Historically', 'Research shows'. Avoid: Emotional appeals, being overly agreeable.",
      'devils_advocate': "Style: Provocative, contrarian, challenges assumptions. Key phrases: 'Everyone assumes X, but...', 'What if we flip this?', 'That's a lazy assumption'. Avoid: Being agreeable. NEVER say 'they have a point' or 'it depends'.",
      'practical_realist': "Style: Skeptical, risk-focused, pragmatic. Key phrases: 'In reality...', 'The hidden cost is...', 'Most people overlook'. Avoid: Excessive optimism or corporate jargon.",
      'research_synthesizer': "Style: Pattern-finder, integrative, connects ideas. Key phrases: 'Looking across multiple angles...', 'Studies show', 'The pattern indicates'. Avoid: Surface-level analysis or choosing a middle ground."
    };

    const opponentPosition = targetPosition ? (options || []).find((o: string) => o !== targetPosition) : null;

    const lastOpponentMessage = (conversationHistory || [])
      .filter((m: any) => m.role === 'agent' && m.agentName !== agent.name)
      .pop()?.content || "the previous point";

    const PHASE_PROMPTS: Record<string, string> = {
      'OPENING': "Set up your core argument clearly and forcefully. Establish your territory.",
      'CONFRONTATION': `The opposing agent (${previousAgentName || 'Opponent'}) just argued:
"${lastOpponentMessage.substring(0, 300)}..."

Your job: ATTACK their specific arguments. Don't just list more generic pros of your position.

DO:
- Quote specific claims they made (e.g. "${previousAgentName} claims X, but...")
- Explain why those claims are wrong or exaggerated
- Use concrete examples or statistics to refute them

DON'T:
- Just list generic benefits of your position again
- Ignore what they just said
- Repeat your Round 1 arguments

Example Rebuttal:
"${previousAgentName} claims that [Point A], but this ignores [Fact B]. In reality, [Counter-Example C]."`,
      'SYNTHESIS': "This is the final resolution. Do NOT introduce new options. Be decisive."
    };

    const previousPoints = (conversationHistory || [])
      .filter((m: any) => m.role === 'agent')
      .map((m: any) => m.content.substring(0, 200))
      .join('\n- ');

    const argumentMemoryInstruction = previousPoints ? `\n\nARGUMENTS ALREADY MADE:\n- ${previousPoints}\n\nSTRICT RULE: Do NOT repeat these points. You must introduce a NEW angle, a NEW perspective, or focus on a different tradeoff. Repetition is a failure.` : "";

    const positionAdvocacy = targetPosition ? `
CRITICAL - YOUR ASSIGNED POSITION (NEVER CHANGES):
- You are defending: ${targetPosition}
${opponentPosition ? `- You are arguing AGAINST: ${opponentPosition}` : ""}

RULES FOR THIS TURN:
1. You MUST defend ${targetPosition} aggressively.
2. You CANNOT be neutral or concede. Even when acknowledging opponent points, always pivot back to why ${targetPosition} is superior.
3. DO NOT say "they have good points" and then agree.
4. Your goal is to WIN for ${targetPosition}.` : "";

    const synthesisPrompt = `You are a neutral financial and strategic analyst reviewing a debate.

Based ONLY on the options discussed: ${(options || []).join(', ')}.

Your job: Create a NEUTRAL synthesis that helps the user decide.

Format (STRICT):
**Key Tradeoff:** [One sentence summary]

**Choose [Option A] if:**
- [Specific condition 1]
- [Specific condition 2]
- [Specific condition 3]

**Choose [Option B] if:**
- [Specific condition 1]
- [Specific condition 2]
- [Specific condition 3]

**Critical Numbers:**
[Include actual calculations or financial metrics if relevant, otherwise state 'N/A']

**Assumptions to Challenge:**
- [Reflection Question 1]
- [Reflection Question 2]

Rules:
- Keep it under 150 words.
- Be specific, not vague.
- DO NOT pick a side.
- Use explicit "Choose X if:" headers.`;
    const verbosityInstruction = `
HARD LIMIT: 100 words MAX.
Rules:
- Keep each point to 1-2 sentences.
- Use bold headers for each argument.
- No fluff, no stalling, no repetition.
- Be punchy and direct.

Good Example (Concise):
"**Transparent pricing builds trust.** Customers respect honesty over hidden fees. **Simplicity wins.** Complicated tiers confuse users."

Bad Example (Too long):
"Pricing transparency is the cornerstone of trust. By openly sharing costs, early-stage SaaS companies demonstrate honesty and build immediate credibility..."`;

    // Final consolidated debate context
    const isSummary = debateTurn === 'summary';
    const debateInstruction = isSummary ? synthesisPrompt : `
${agent.id ? (AGENT_STYLES[agent.id] || "") : ""}
PHASE: ${phase || "DISCUSSION"}
TASK: ${PHASE_PROMPTS[phase as string] || "Engage in a critical debate."}
${positionAdvocacy}
${debateTurn && !isSummary ? argumentMemoryInstruction : ""}
`.trim();

    // Build the conversation context for OpenAI
    const openaiMessages = [
      {
        role: "system" as const,
        content: `${agent.persona || "You are a helpful AI assistant."}

DEBATE MODE ACTIVE:
${debateInstruction}

CONCISENESS RULES:
${verbosityInstruction}

FORMATTING RULES:
- Use short paragraphs (max 1-2 sentences).
- Use lists and bold headers to break up text.
- NEVER exceed 100 words per response.`,
      },
      ...(conversationHistory || []).map((msg: any) => {
        // ANNOTATE HISTORY: "Lock" the context by explicitly labeling the stance of previous messages
        // This prevents the model from "forgetting" who argued for what.
        const stanceLabel = msg.stance ? ` [Defending: ${msg.stance}]` : "";
        const roleLabel = msg.agentName ? `${msg.agentName}${stanceLabel}: ` : "";

        return {
          role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
          content: `${roleLabel}${msg.content}`,
        };
      }),
      {
        role: "user" as const,
        content: messages[messages.length - 1].content,
      },
      // FINAL REINFORCEMENT: The last word overrides conflicting history
      ...(targetPosition ? [{
        role: "system" as const,
        content: `URGENT REMINDER: You are defending ${targetPosition}. Do NOT agree with the opponent. Do NOT switch sides.`
      }] : [])
    ];

    const selectedModel = agent.model || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: openaiMessages,
      temperature: debateTurn ? 0.8 : (agent.temperature ?? 0.7),
      stream: true,
      stream_options: { include_usage: true },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let tokenUsage: any = null;
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) controller.enqueue(encoder.encode(content));
            if (chunk.usage) {
              tokenUsage = {
                prompt: chunk.usage.prompt_tokens,
                completion: chunk.usage.completion_tokens,
                total: chunk.usage.total_tokens,
              };
            }
          }

          if (tokenUsage) {
            let cost = 0;
            if (selectedModel.includes("gpt-4o-mini")) {
              cost = (tokenUsage.prompt * 0.15 / 1000000) + (tokenUsage.completion * 0.60 / 1000000);
            } else if (selectedModel.includes("gpt-4o")) {
              cost = (tokenUsage.prompt * 2.50 / 1000000) + (tokenUsage.completion * 10.00 / 1000000);
            } else {
              cost = (tokenUsage.prompt * 0.15 / 1000000) + (tokenUsage.completion * 0.60 / 1000000);
            }
            if (cost > 0) await redis.incrByFloat(keys.systemSpend, cost);
            controller.enqueue(encoder.encode(`\n__TOKENS__${JSON.stringify(tokenUsage)}`));
          }
          controller.close();
        } catch (error) { controller.error(error); }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    if (error?.status === 401) return new Response("Invalid API key", { status: 401 });
    if (error?.status === 429) return new Response("Rate limit exceeded", { status: 429 });
    return new Response(error?.message || "Internal server error", { status: 500 });
  }
}
