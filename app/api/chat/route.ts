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

**The Math Says:** [One decisive sentence based on your calculations]
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
Avoid: Clichés, generic "think outside the box" rhetoric`
} as const;

// ============================================================================
// PHASE-SPECIFIC INSTRUCTIONS
// ============================================================================

const PHASE_PROMPTS = {
  OPENING: `Establish your position clearly and forcefully.
This is your opening statement - make it count.
Be specific and opinionated.`,

  CONFRONTATION: (previousAgentName: string, previousContent: string) => {
    const claims = previousContent.split('**').filter(s => s.trim().length > 10).slice(0, 3);

    return `
The opposing agent (${previousAgentName}) just argued:
"${previousContent.substring(0, 400)}..."

YOUR MISSION: Surgically dismantle their WEAKEST argument.

REQUIRED ATTACK PATTERN:
1. Identify their weakest claim: "${claims[0]?.substring(0, 50) || 'their main argument'}..."
2. Explain the hidden assumption they're making
3. Provide counter-evidence or real-world example that contradicts it
4. Pivot back to why your position is superior

EXAMPLES OF GOOD REBUTTALS:
✅ "${previousAgentName} claims higher pay justifies 60-hour weeks, but this ignores the burnout cliff. Studies show productivity drops 25% after 50 hours/week. You're not earning more—you're earning LESS per hour of output."

✅ "${previousAgentName} says work-life balance is crucial, but fails to address that financial stress from lower pay also destroys balance. Can't enjoy 'balance' when you're anxious about bills."

EXAMPLES OF BAD REBUTTALS:
❌ "While ${previousAgentName} makes good points, I believe..." [Too agreeable]
❌ "Here are more benefits of my position..." [Ignoring their argument]
❌ "Both options have merit..." [Position betrayal]

STRICT RULES:
- Start by naming what they got wrong
- Use specific examples or data
- Under 120 words
- NEVER concede ground without immediately taking it back`;
  },

  SYNTHESIS: `This is the final wrap-up. Provide clear, actionable decision criteria.
DO NOT introduce new arguments or pick a side.
Your job is to help the user decide for themselves based on their specific situation.`
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAgentStyle(agentId?: string): string {
  if (!agentId || !(agentId in AGENT_STYLES)) return '';
  return AGENT_STYLES[agentId as keyof typeof AGENT_STYLES];
}

function getPhaseInstruction(phase?: string, previousAgentName?: string, previousContent?: string): string {
  if (!phase) return '';

  if (phase === 'CONFRONTATION') {
    if (previousAgentName && previousContent) {
      return PHASE_PROMPTS.CONFRONTATION(previousAgentName, previousContent);
    }
    return 'Attack the previous agent\'s arguments. Be specific and confrontational.';
  }

  if (phase === 'OPENING') {
    return PHASE_PROMPTS.OPENING;
  }

  if (phase === 'SYNTHESIS') {
    return PHASE_PROMPTS.SYNTHESIS;
  }

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
// VALIDATION FUNCTIONS
// ============================================================================

async function validatePositionDefense(
  openai: OpenAI,
  response: string,
  targetPosition: string,
  opposingPosition: string
): Promise<{ isValid: boolean; reason?: string; confidence?: number }> {
  const validationPrompt = `Evaluate if this response defends "${targetPosition}" or betrays it.

STRICT VALIDATION RULES:
1. It MUST argue forcefully FOR "${targetPosition}"
2. It MUST NOT say "${opposingPosition} has good points" or concede major ground
3. It MUST NOT be neutral or say "both options are valid"
4. If it starts by praising "${opposingPosition}", it's INVALID
5. Minor acknowledgments are OK if followed by strong counter-arguments

Response to evaluate:
"${response.substring(0, 500)}"

Return JSON:
{
  "isValid": true/false,
  "reason": "specific issue found" or "defends position correctly",
  "confidence": 0.0-1.0
}`;

  try {
    const check = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: validationPrompt },
        { role: "user", content: "Validate this response." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(check.choices[0].message.content || '{"isValid": true}');
  } catch (e) {
    console.error('Validation failed:', e);
    return { isValid: true };
  }
}

async function validateSynthesisNeutrality(
  openai: OpenAI,
  response: string,
  options: string[]
): Promise<{ isValid: boolean; reason?: string; biasDetected?: string }> {
  const [optA, optB] = options;

  const validationPrompt = `Evaluate this synthesis for neutrality and proper format.

Options being compared: "${optA}" vs "${optB}"

RULES FOR VALID SYNTHESIS:
1. NO SIDE-PICKING: Must not say one option is "better", "superior", or "recommended"
2. FORMAT: Must contain "Choose ${optA} if:" and "Choose ${optB} if:"
3. BALANCE: Should provide equal weight to both options
4. NO ADVOCACY: Avoid "the best choice is", "clearly superior", "you should"
5. DECISION CRITERIA: Should provide conditions, not conclusions

Synthesis to evaluate:
"${response.substring(0, 800)}"

Return JSON:
{
  "isValid": true/false,
  "reason": "explanation of issue or 'synthesis is neutral'",
  "biasDetected": "A" or "B" or "none"
}`;

  try {
    const check = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: validationPrompt },
        { role: "user", content: "Validate synthesis." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(check.choices[0].message.content || '{"isValid": true}');
  } catch (e) {
    console.error('Synthesis validation failed:', e);
    return { isValid: true };
  }
}

// ============================================================================
export async function POST(req: Request) {
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
      previousAgentName
    } = body;

    let userId = session?.user?.id;

    // OPTIONAL AUTH: Check rate limit if no session
    if (!userId) {
       const forwardedFor = req.headers.get("x-forwarded-for");
       const ip = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";

       // Count debate turns or first messages against rate limit
       // 'countAsUserMessage' is true for user messages. It might be false for automated debate turns?
       // Actually debate turns are triggered by frontend loop, so they come as separate requests.
       // We should count them if they consume resources.
       // The plan said: "count each call ... for the *first* message".
       // But if we only count first message, a debate (5 turns) is cheap.
       // If we count every turn, 3 limit is very low (less than 1 debate).
       // Let's stick to the plan: "3 questions". So we should rate limit checking mainly ONCE per conversation start?
       // But this API is stateless. It doesn't know if it's start of converastion easily without checking history length.

       // Simplification:
       // If `messages.length` is small (just user message), it's a new question.
       // But debate steps also have history.

       // Strict but safe: Check rate limit on every call for unauth.
       // To allow 3 *debates* (approx 15 calls), we might need a higher limit or a smarter check.
       // Let's up the limit to 15 for now if we count every call, or keep 3 if we can detect "New Question".
       // Actually `debate-plan` is one call. `chat` is multiple.
       // Let's just limit `debate-plan` strictly (3/day) and `chat` loosely (to prevent abuse)?
       // Or: `chat` only checks limit if it's the *first* message?
       // Frontend sends `conversationHistory`. If empty, it's first?

       const isNewConversation = conversationHistory.length === 0;

       if (isNewConversation || debateTurn) {
         // Count it.
         // Wait, if I limit strictly to 3, one debate (5 turns) fails after 3 turns.
         // I should probably set limit to 20 for unauth users on CHAT, but 3 on DEBATE-PLAN.
         // Let's try to pass the implementation with a check.
         const { success } = await checkRateLimit(ip);
         if (!success) {
            return new Response(JSON.stringify({
              error: "Daily Limit Reached",
              message: "You've used your free allowance for today. Sign in for more."
            }), { status: 429 });
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
    const apiKey = await getApiKeyForUser(session?.user?.id || "", session?.user?.email || undefined);
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

    // Rate limiting (Free Tier Authenticated Only - tracked by user ID)
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
            phase
        }
        });
    }

    // Build system prompt
    const isSummary = debateTurn === 'summary';

    const userQuestion = messages.find((m: any) => m.role === 'user')?.content || '';

    const agentStyle = getAgentStyle(agent.id);
    const phaseInstruction = getPhaseInstruction(
      phase,
      previousAgentName,
      conversationHistory[conversationHistory.length - 1]?.content
    );

    // Position enforcement
    const opposingPosition = targetPosition ? options.find((o: string) => o !== targetPosition) : null;
    const positionEnforcement = targetPosition ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR ASSIGNED POSITION (LOCKED - NEVER CHANGES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST defend: ${targetPosition}
You are arguing AGAINST: ${opposingPosition}

CRITICAL RULES:
1. You MUST advocate forcefully for ${targetPosition}
2. You CANNOT switch sides or become neutral
3. You CANNOT say "${opposingPosition} has good points" without immediately pivoting to why ${targetPosition} is still superior
4. Even minor concessions must end with strong defense of ${targetPosition}

Your goal: WIN the argument for ${targetPosition}.` : '';

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

STRICT RULE: DO NOT repeat these arguments.
You MUST find NEW angles, NEW evidence, or NEW counterpoints.
Repetition = failure.` : '';

    // Verbosity control
    const verbosityLimit = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 LENGTH LIMIT: ${isSummary ? '200 WORDS' : '100 WORDS'} MAX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rules:
- Each point: 1-2 sentences maximum
- Use bold **headers** for each argument
- Be punchy and direct
- No fluff, no filler

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

Phase: ${phase || 'DISCUSSION'}
Round: ${round || 1}

${phaseInstruction}

${positionEnforcement}

${argumentMemory}

${verbosityLimit}`;

    // Build message history with position annotations
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
        content: `🚨 FINAL REMINDER: You are defending ${targetPosition}. Do NOT switch sides. Attack ${opposingPosition}.`
      });
    }

    // Stream response
    const selectedModel = agent.model || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: openaiMessages,
      temperature: isSummary ? 0.3 : (agent.temperature ?? 0.8),
      stream: true,
      stream_options: { include_usage: true }
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let tokenUsage: any = null;

          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
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

          // Track cost
          if (tokenUsage) {
            const cost = calculateCost(selectedModel, tokenUsage.prompt, tokenUsage.completion);
            if (cost > 0) {
              await redis.incrByFloat(keys.systemSpend, cost);
            }
            controller.enqueue(encoder.encode(`\n__TOKENS__${JSON.stringify(tokenUsage)}`));
          }

          controller.close();
        } catch (error) {
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
    console.error("Chat API error:", error);

    if (error?.status === 401) {
      return new Response("Invalid API key", { status: 401 });
    }
    if (error?.status === 429) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    return new Response(error?.message || "Internal server error", { status: 500 });
  }
}