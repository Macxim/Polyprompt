import { OpenAI } from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";
import { checkRateLimit } from "@/lib/rate-limit";
import posthog from "@/lib/posthog";
import { keys, redis, ensureConnection } from "@/lib/redis";

export const runtime = "nodejs";

const DAILY_MESSAGE_LIMIT = 10;
const BUDGET_LIMIT = 30.0;

// ============================================================================
// UNIVERSAL INTELLIGENT SYNTHESIS
// ============================================================================

function getUniversalSynthesisPrompt(question: string, options: string[]): string {
  const containsMoney = /\$|dollar|money|income|salary|pay|cost|price|equity/i.test(
    question + ' ' + options.join(' ')
  );

  return `You are synthesizing a debate for this question:
"${question}"

Options debated: ${options.join(' vs ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR JOB: BE SO SPECIFIC THAT READERS CAN IMMEDIATELY DECIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTELLIGENCE RULES:

1️⃣ DETECT WHAT MATTERS & CALCULATE IT
   - Money in question? → Calculate breakeven, ROI, hourly rates, compound interest
   - Time mentioned? → Calculate hourly/yearly value, opportunity cost
   - Age/life stage? → Give age ranges ("under 30", "65+"), not vague "young/old"
   - Risk involved? → Quantify probability, cite historical data, show downside

2️⃣ NO VAGUE CONDITIONS (This is CRITICAL)
   ❌ BAD: "Choose X if you value security"
   ✅ GOOD: "Choose X if you're 65+ and may not reach 20-year breakeven"

   ❌ BAD: "Choose Y if you prioritize growth"
   ✅ GOOD: "Choose Y if you're under 30 with 6+ months savings and work in law/finance"

   ❌ BAD: "Choose X if it fits your situation"
   ✅ GOOD: "Choose X if you have kids under 10 who need your time now"

3️⃣ INCLUDE MATH WHEN RELEVANT
   - Comparing $ amounts? → Show calculations, breakeven analysis
   - Comparing time? → Calculate hourly rates or yearly totals
   - Comparing risk? → Show probability or cite historical outcomes

4️⃣ BE RUTHLESSLY SPECIFIC
   - Use numbers: "under 30", "6+ months savings", "3x more jobs"
   - Use concrete conditions: "have dependents", "work in law", "own a home"
   - Use measurable criteria: "can invest at 7%", "live 20+ more years"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT (STRICT - USE THIS STRUCTURE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Key Tradeoff:** [One decisive sentence]

**Choose ${options[0]} if:**
- [Concrete measurable condition with numbers/ages/situations]
- [Concrete measurable condition with numbers/ages/situations]
- [Concrete measurable condition with numbers/ages/situations]

**Choose ${options[1]} if:**
- [Concrete measurable condition with numbers/ages/situations]
- [Concrete measurable condition with numbers/ages/situations]
- [Concrete measurable condition with numbers/ages/situations]

${containsMoney ? `
**Critical Numbers:**
[MUST CALCULATE: breakeven years, ROI comparison, annual amounts, hourly rates, compound growth, or whatever numbers are relevant to this decision. NEVER write "N/A" here.]

**The Math Says:** [One decisive sentence based on calculations]
` : ''}

**Assumptions to Challenge:**
- [What did the question assume but not state?]
- [What critical information is missing for this decision?]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES OF GOOD SYNTHESIS (LEARN FROM THESE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1 - Financial Question:
✅ "Choose $1000/week if you're 65+ and may not live to 20-year breakeven point ($1.04M total)"
✅ "Choose $1M lump sum if you're under 50 and can invest at 7% returns ($70k/year beats $52k/year)"
✅ "Critical Numbers: Breakeven is 19.2 years. $1M at 7% = $1.97M after 20 years vs $1.04M from weekly."
❌ "Choose $1000/week if you prefer stability" [TOO VAGUE]

Example 2 - Career Question:
✅ "Choose 60hr job if you're under 30 with no dependents and work in law/banking where grinding compounds"
✅ "Choose 30hr job if you're 40+ with kids and work in creative fields where rest improves output"
❌ "Choose 60hr job if you want career growth" [TOO VAGUE]

Example 3 - Tech Question:
✅ "Choose React if job hunting in next 6 months (3x more LinkedIn postings than Vue, $15k higher avg salary)"
✅ "Choose Vue if working at small startup that values developer happiness over hiring pool"
❌ "Choose React if you want more opportunities" [TOO VAGUE]

Example 4 - Business Question:
✅ "Choose B2B if selling to enterprises with $50k+ contracts and 6-12 month sales cycles"
✅ "Choose B2C if you need cash flow in 3 months and can acquire customers for under $50"
❌ "Choose B2B if you want stable revenue" [TOO VAGUE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Under 200 words total
- Be RUTHLESSLY specific with every condition
- DO NOT pick a side - provide decision criteria only
- DO NOT say "it depends" without stating exactly what it depends on
- DO NOT use vague words like "young", "stable", "growth" without quantifying them
- If money is involved, MUST calculate and show the math

Your synthesis should be so specific that someone can read it and immediately know which option fits their situation.`;
}

// ============================================================================
// AGENT RHETORICAL STYLES
// ============================================================================

const AGENT_STYLES = {
  'strategic_analyst': `Style: Data-focused, uses frameworks and research.
Phrases: "The data suggests", "Research indicates", "Historical patterns show"
Avoid: Emotional appeals, being overly agreeable, hedging with "it depends"`,

  'devils_advocate': `Style: Provocative, contrarian, challenges assumptions aggressively.
Phrases: "Everyone assumes X, but...", "That's backwards thinking", "This conventional wisdom is wrong"
Avoid: NEVER say "they have a point" or "I agree". Your job is pure opposition.`,

  'practical_realist': `Style: Skeptical, risk-focused, pragmatic about constraints.
Phrases: "In reality...", "The hidden cost is...", "Most people overlook"
Avoid: Excessive optimism, corporate jargon, abstract theorizing`,

  'research_synthesizer': `Style: Pattern-finder, integrative, connects disparate ideas.
Phrases: "Looking across evidence...", "Studies consistently show", "The pattern reveals"
Avoid: Surface analysis, fence-sitting, avoiding clear positions`,

  'creative_ideator': `Style: Innovative, future-focused, explores unconventional angles.
Phrases: "What if we reframe this...", "The emerging trend shows", "Innovation requires"
Avoid: Clichés, generic "think outside the box" rhetoric, hedging with "it depends".`
} as const;

// ============================================================================
// PHASE-SPECIFIC INSTRUCTIONS
// ============================================================================

const PHASE_PROMPTS = {
  OPENING: `Establish your position clearly and forcefully.
This is your opening statement - make it count.
Be specific and opinionated.`,

  CONFRONTATION: (previousAgentName: string, previousContent: string, isOpen: boolean = false) => {
    const snippet = previousContent.substring(0, 400);

    return `
The other agent (${previousAgentName}) just argued:
"${snippet}..."

YOUR MISSION: ${isOpen ? "Deepen the analysis by addressing their points." : "Surgically dismantle their WEAKEST argument."}

REQUIRED PATTERN:
1. Identify their ${isOpen ? "main" : "weakest"} claim
2. Explain the ${isOpen ? "perspective" : "hidden assumption"} they're making
3. Provide ${isOpen ? "alternative angle or context" : "counter-evidence or real-world example"} that ${isOpen ? "complements or challenges" : "contradicts"} it
4. Pivot back to why your position is ${isOpen ? "critical" : "superior"}

${isOpen ? '' : `
EXAMPLES OF GOOD REBUTTALS:
✅ "${previousAgentName} claims higher pay justifies 60-hour weeks, but this ignores the burnout cliff. Studies show productivity drops 25% after 50 hours/week. You're not earning more—you're earning LESS per hour of output."

✅ "${previousAgentName} says work-life balance is crucial, but fails to address that financial stress from lower pay also destroys balance. Can't enjoy 'balance' when you're anxious about bills."

EXAMPLES OF BAD REBUTTALS:
❌ "While ${previousAgentName} makes good points, I believe..." [Too agreeable]
❌ "Here are more benefits of my position..." [Ignoring their argument]
❌ "Both options have merit..." [Position betrayal]
`}

STRICT RULES:
- ${isOpen ? "Name what they correctly identified, then pivot" : "Start by naming what they got wrong"}
- Use specific examples or data
- Under 120 words
- ${isOpen ? "Maintain your assigned perspective" : "NEVER concede without taking ground back"}`;
  },

  SYNTHESIS: `This is the final wrap-up. Provide clear, actionable decision criteria.
DO NOT introduce new arguments or pick a side.
Help the user decide based on their specific situation.`
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAgentStyle(agentId?: string): string {
  if (!agentId || !(agentId in AGENT_STYLES)) return '';
  return AGENT_STYLES[agentId as keyof typeof AGENT_STYLES];
}

function getPhaseInstruction(
  isOpen: boolean,
  phase?: string,
  previousAgentName?: string,
  previousContent?: string
): string {
  if (!phase) return '';

  if (phase === 'CONFRONTATION') {
    if (previousAgentName && previousContent) {
      return PHASE_PROMPTS.CONFRONTATION(previousAgentName, previousContent, isOpen);
    }
    return isOpen
      ? 'Deepen the analysis by exploring the previous agent\'s points from your perspective.'
      : 'Attack the previous agent\'s arguments. Be specific and confrontational.';
  }

  if (phase === 'OPENING') return PHASE_PROMPTS.OPENING;
  if (phase === 'SYNTHESIS') return PHASE_PROMPTS.SYNTHESIS;

  return '';
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  return (promptTokens * modelPricing.input / 1_000_000) + (completionTokens * modelPricing.output / 1_000_000);
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(req: Request) {
  console.log("💬 Chat API called");

  try {
    const session = await getServerSession(authOptions);
    await ensureConnection();

    const body = await req.json();
    const {
      messages,
      agent,
      conversationHistory = [],
      countAsUserMessage = false,
      debateTurn,
      targetPosition,
      options = [],
      round,
      phase,
      previousAgentName,
      isOpen = false
    } = body;

    console.log(`📊 Debate turn: ${debateTurn}, Round: ${round}, Phase: ${phase}, isOpen: ${isOpen}`);

    let userId = session?.user?.id;

    // Rate limiting for unauthenticated users
    if (!userId) {
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";

      const isNewConversation = conversationHistory.length === 0;

      if (isNewConversation || debateTurn) {
        const { success } = await checkRateLimit(ip);
        if (!success) {
          return new Response(JSON.stringify({
            error: "Daily Limit Reached",
            message: "You've used your free allowance for today. Sign in for more."
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      userId = `guest-${ip}`;
    }

    // Budget check
    const currentSpendStr = await redis.get(keys.systemSpend);
    const currentSpend = parseFloat(currentSpendStr || "0");

    if (currentSpend >= BUDGET_LIMIT) {
      return new Response(JSON.stringify({
        error: "Monthly Budget Reached",
        message: "System budget exceeded. Please contact administrator."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // API key check
    const apiKey = await getApiKeyForUser(
      session?.user?.id || "",
      session?.user?.email || undefined
    );

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "API Key Required",
        message: "Please add your OpenAI API key in Settings."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const openai = new OpenAI({ apiKey });

    // Rate limiting for authenticated users on system key
    const isUsingSystemKey = apiKey === process.env.OPENAI_API_KEY;
    if (session?.user?.id && isUsingSystemKey && countAsUserMessage) {
      const dailyKey = keys.userDailyMessages(session.user.id);
      const currentCount = parseInt((await redis.get(dailyKey)) || "0", 10);

      if (currentCount >= DAILY_MESSAGE_LIMIT) {
        return new Response(JSON.stringify({
          error: "Daily Limit Reached",
          message: `You've used all ${DAILY_MESSAGE_LIMIT} free messages today. Add your own API key for unlimited access.`,
          remainingMessages: 0
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }

      const newCount = await redis.incr(dailyKey);
      if (newCount === 1) await redis.expire(dailyKey, 86400);
    }

    // Track event
    if (session?.user?.id) {
      posthog.capture({
        distinctId: session.user.id,
        event: 'message_sent',
        properties: {
          agent_id: agent.id,
          agent_name: agent.name,
          model: agent.model || "gpt-4o-mini",
          is_byok: !isUsingSystemKey,
          debate_turn: debateTurn,
          target_position: targetPosition,
          round,
          phase,
          is_open: isOpen
        }
      });
    }

    // Build system prompt
    const isSummary = debateTurn === 'summary';
    const userQuestion = messages.find((m: any) => m.role === 'user')?.content || '';

    const agentStyle = getAgentStyle(agent.id);
    const phaseInstruction = getPhaseInstruction(
      isOpen,
      phase,
      previousAgentName,
      conversationHistory[conversationHistory.length - 1]?.content
    );

    // Position enforcement for debate turns
    const opposingPosition = targetPosition ? options.find((o: string) => o !== targetPosition) : null;
    const positionEnforcement = targetPosition && !isSummary ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR ASSIGNED POSITION (LOCKED - NEVER CHANGES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST defend: ${targetPosition}
You are ${isOpen ? "exploring this perspective against" : "arguing AGAINST"}: ${opposingPosition}

CRITICAL RULES:
1. You MUST advocate for ${targetPosition}
2. You CANNOT switch sides or become neutral
3. ${isOpen ? "You explore your perspective while acknowledging others" : "You attack the opposing view"}
4. Stay within your assigned lens

Your goal: ${isOpen ? "Deepen understanding of" : "WIN the argument for"} ${targetPosition}.` : '';

    // Argument memory (prevent repetition)
    const previousArguments = conversationHistory
      .filter((m: any) => m.role === 'agent' && m.agentName === agent.name)
      .map((m: any) => m.content.substring(0, 150))
      .join('\n- ');

    const argumentMemory = previousArguments && !isSummary ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ARGUMENTS YOU ALREADY MADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- ${previousArguments}

DO NOT repeat these. Find NEW angles, evidence, or counterpoints.` : '';

    // Verbosity control
    const verbosityLimit = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 LENGTH LIMIT: ${isSummary ? '200 WORDS' : '120 WORDS'} MAX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Each point: 1-2 sentences
- Use bold **headers** for structure
- Be punchy and direct
- No fluff

Good: "**Trust matters.** Customers respect honesty. Hidden pricing feels like a trap."
Bad: "Pricing transparency is fundamentally important because it builds trust with customers by demonstrating honesty..."`;

    // Build final system prompt
    const systemPrompt = isSummary
      ? getUniversalSynthesisPrompt(userQuestion, options)
      : `${agent.persona || "You are a debate participant."}

${agentStyle}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 DEBATE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question Type: ${isOpen ? "OPEN (Exploring perspectives)" : "COMPARATIVE (Choosing between options)"}
Phase: ${phase || 'DISCUSSION'}
Round: ${round || 1}

${phaseInstruction}

${positionEnforcement}

${argumentMemory}

${verbosityLimit}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 FACT-CHECKING & PRECISION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VERIFY BEFORE CITING:
   - Only cite specific statistics or data points if you are certain of their accuracy.
   - If you're providing an example that isn't a verified fact, CLEARLY mark it as "illustrative" or "hypothetical".
   - Using phrases like "For example, hypothetically..." or "As an illustrative case..." is mandatory for non-verified examples.

2. MATH DOUBLE-CHECK:
   - If your argument involves calculations (ROI, breakeven, interest, etc.), you MUST double-check the math before sending.
   - Show your work clearly if requested or if it's central to the argument.
   - Inaccuracies in math are a protocol violation.`;

    console.log(`🎯 System prompt built. Length: ${systemPrompt.length} chars`);

    // Build message history
    const annotatedHistory = conversationHistory.map((msg: any) => {
      const stanceLabel = msg.stance ? ` [Defending: ${msg.stance}]` : '';
      const agentLabel = msg.agentName ? `${msg.agentName}${stanceLabel}: ` : '';

      return {
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: `${agentLabel}${msg.content}`
      };
    });

    const openaiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...annotatedHistory,
      { role: "user" as const, content: messages[messages.length - 1].content }
    ];

    // Final position reminder
    if (targetPosition && !isSummary) {
      openaiMessages.push({
        role: "system" as const,
        content: `🚨 FINAL REMINDER: You are defending ${targetPosition}. ${isOpen ? "Explore this perspective deeply." : `Do NOT switch sides. Keep the same stance. Attack ${opposingPosition}.`}`
      });
    }

    console.log(`📤 Sending to OpenAI. Total messages: ${openaiMessages.length}`);

    // Stream response
    const selectedModel = agent.model || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: openaiMessages,
      temperature: isSummary ? 0.3 : (agent.temperature ?? 0.8),
      stream: true,
      stream_options: { include_usage: true }
    });

    console.log("✅ Stream started");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let tokenUsage: any = null;
          let chunkCount = 0;
          let fullContent = "";

          for await (const chunk of response) {
            const content = chunk.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              chunkCount++;
              controller.enqueue(encoder.encode(content));
            }

            if (chunk.usage) {
              tokenUsage = {
                prompt: chunk.usage.prompt_tokens,
                completion: chunk.usage.completion_tokens,
                total: chunk.usage.total_tokens
              };
            }
          }

          console.log(`✅ Stream complete. Chunks: ${chunkCount}`);

          // Repetition detection
          const previousArgsArr: string[] = (previousArguments || "")
            .split(/\n\s*-\s*/g)
            .map((a: string) => a.trim())
            .filter((a: string) => a.length > 20);

          const normalizedContent = fullContent.toLowerCase();

          const isRepeating = previousArgsArr.some((prev: string) => {
            const sample = prev.slice(0, 60).toLowerCase();
            return sample.length > 0 && normalizedContent.includes(sample);
          });

          if (isRepeating && !isSummary) {
            console.log("⚠️ Repetition detected in agent response");
            controller.enqueue(encoder.encode(`\n__REPETITION_DETECTED__`));
          }


          // Track cost
          if (tokenUsage) {
            const cost = calculateCost(selectedModel, tokenUsage.prompt, tokenUsage.completion);
            if (cost > 0) {
              await redis.incrByFloat(keys.systemSpend, cost);
            }
            console.log(`💰 Cost: $${cost.toFixed(6)}, Tokens: ${tokenUsage.total}`);
            controller.enqueue(encoder.encode(`\n__TOKENS__${JSON.stringify(tokenUsage)}`));
          }

          controller.close();
        } catch (error) {
          console.error("❌ Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      }
    });

  } catch (error: any) {
    console.error("❌ Chat API error:", error);

    if (error?.status === 401) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (error?.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      error: error?.message || "Internal server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}