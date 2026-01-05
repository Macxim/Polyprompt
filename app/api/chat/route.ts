import { OpenAI } from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";
import posthog from "@/lib/posthog";
import { keys, redis, ensureConnection } from "@/lib/redis";

export const runtime = "nodejs";

const DAILY_MESSAGE_LIMIT = 10;
const BUDGET_LIMIT = 30.0;

// ============================================================================
// TYPE-SPECIFIC CONFIGURATIONS
// ============================================================================

const TYPE_SPECIFIC_GUIDANCE = {
  FINANCIAL: `CRITICAL for financial questions:
- Include specific numbers (ROI, breakeven, compound interest)
- Address risk tolerance explicitly
- Compare opportunity costs using actual calculations
- Example: "$1M at 7% = $70k/year forever vs $52k/year from weekly payments"
- DO NOT say "Critical Numbers: N/A" - always calculate`,

  CAREER: `CRITICAL for career questions:
- Consider life stage (20s vs 40s) and financial obligations (dependents, mortgage)
- Evaluate skill development vs immediate income tradeoffs
- Discuss burnout risk, work-life balance, long-term trajectory
- Be specific about conditions: "If you're under 30 with 6mo savings" not "if you value growth"`,

  RELATIONSHIP: `CRITICAL for relationship questions:
- Be sensitive, non-judgmental, and empathetic
- Focus on behavioral patterns, not isolated incidents
- Distinguish between fixable communication issues vs fundamental incompatibility
- Suggest professional help if red flags appear (abuse, addiction, severe conflict)
- NEVER be prescriptive - provide reflection prompts`,

  TECHNOLOGY: `CRITICAL for tech questions:
- Cite specific technical advantages/tradeoffs with examples
- Mention job market data (salary ranges, demand trends)
- Compare ecosystem maturity, learning curves, performance benchmarks
- Be opinionated but fair: "React has 3x more jobs than Vue on LinkedIn"`,

  LIFESTYLE: `CRITICAL for lifestyle questions:
- Focus on values alignment and quality of life metrics
- Consider practical constraints (commute, cost, social life)
- Provide concrete decision criteria based on life priorities
- Avoid generic "it depends on your situation" - give specific conditions`,

  BUSINESS: `CRITICAL for business questions:
- Focus on market dynamics, competitive positioning, unit economics
- Consider scalability, customer acquisition costs, defensibility
- Be data-driven where possible (market size, growth rates)
- Address founder/team capabilities and execution risk`
} as const;

const SYNTHESIS_TEMPLATES = {
  FINANCIAL: (options: string[]) => `You are a financial analyst synthesizing a debate.

Options discussed: ${options.join(' vs ')}

Create a QUANTITATIVE synthesis with this EXACT format:

**Key Tradeoff:** [One sentence on the core financial decision]

**Choose ${options[0]} if:**
- [Financial/risk condition with numbers]
- [Life stage or obligation (e.g., "You're 65+ and may not reach 20yr breakeven")]
- [Spending discipline consideration]

**Choose ${options[1]} if:**
- [Financial/risk condition with numbers]
- [Life stage or obligation]
- [Investment capability assessment]

**Critical Numbers:**
- [Calculate key metrics: breakeven years, annual returns, total over time]
- [Show comparison: Option A yields X over Y years vs Option B]
- [ROI analysis if relevant]

**The Math Says:** [One decisive sentence based on calculations]

**Assumptions to Challenge:**
- [Question about ability to achieve stated returns]
- [Question about risk tolerance or discipline]
- [Question about time horizon or life expectancy]

RULES:
- Under 200 words
- MUST include actual numbers in "Critical Numbers" section
- NEVER write "Critical Numbers: N/A" for financial questions
- Be specific, not vague: "If you're under 40" not "if you're young"`,

  CAREER: (options: string[]) => `You are a career advisor synthesizing a debate.

Options discussed: ${options.join(' vs ')}

Create a LIFE-STAGE-BASED synthesis with this EXACT format:

**Key Tradeoff:** [Security vs Growth, Income vs Learning, etc]

**Choose ${options[0]} if:**
- [Age/life stage condition: "You're 40+ with dependents"]
- [Financial situation: "You have <3 months savings"]
- [Risk tolerance: specific condition]

**Choose ${options[1]} if:**
- [Age/life stage condition]
- [Financial situation]
- [Risk tolerance: specific condition]

**Critical Questions:**
- Do you have 6+ months emergency fund?
- Do you have dependents relying on your income?
- What's your 5-year career trajectory with each option?
- Can you afford 6 months unemployment if it fails?

**Red Flags:**
- [Warning signs for Option A]
- [Warning signs for Option B]

RULES:
- Under 200 words
- Give concrete conditions, not vague preferences
- Focus on decision criteria based on personal circumstances`,

  RELATIONSHIP: (options: string[]) => `You are providing relationship perspective (NOT therapy).

Options discussed: ${options.join(' vs ')}

Create an EMPATHETIC synthesis with this EXACT format:

**Key Question:** [What is really at stake in this relationship decision?]

**Signs This Might Be Worth Working On:**
- [Positive pattern or fixable issue]
- [Shared values or compatible life goals]

**Signs of Fundamental Incompatibility:**
- [Deal-breaker: different views on children, values, life goals]
- [Unhealthy pattern: abuse, addiction, severe dysfunction]

**Questions for Self-Reflection:**
- [Deep question about your needs and boundaries]
- [Question about patterns vs isolated incidents]
- [Question about long-term compatibility]

**Important Note:**
"These are complex personal matters. Consider speaking with a licensed therapist or relationship counselor who can understand your specific situation and provide personalized guidance."

RULES:
- Under 200 words
- Be non-judgmental and empathetic
- Do NOT tell them what to do - provide reflection framework
- Suggest professional help if red flags present`,

  DEFAULT: (options: string[]) => `You are synthesizing a debate.

Options discussed: ${options.join(' vs ')}

Create a NEUTRAL synthesis with this EXACT format:

**Key Tradeoff:** [One sentence]

**Choose ${options[0]} if:**
- [Specific condition 1]
- [Specific condition 2]

**Choose ${options[1]} if:**
- [Specific condition 1]
- [Specific condition 2]

**Assumptions to Challenge:**
- [Question about unstated assumption 1]
- [Question about unstated assumption 2]

RULES:
- Under 150 words
- Be specific with conditions, not vague
- Do NOT pick a side - provide decision criteria`
} as const;

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

  CONFRONTATION: (previousAgentName: string, previousContent: string) => `
The opposing agent (${previousAgentName}) just argued:
"${previousContent.substring(0, 300)}..."

Your job: ATTACK their specific arguments. Do NOT just list more pros of your position.

REQUIRED FORMAT:
1. Quote or reference a specific claim they made
2. Explain why it's wrong, exaggerated, or incomplete
3. Provide counter-evidence or examples

Example: "${previousAgentName} claims X gives advantage Y, but this ignores Z. In reality, [counter-example]."

DO NOT:
- Ignore what they said
- Just list generic benefits again
- Repeat your Round 1 arguments`,

  SYNTHESIS: `This is the final wrap-up. Provide clear, actionable decision criteria.
DO NOT introduce new arguments or pick a side.
Your job is to help the user decide for themselves based on their specific situation.`
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTypeGuidance(type?: string): string {
  if (!type || !(type in TYPE_SPECIFIC_GUIDANCE)) return '';
  return TYPE_SPECIFIC_GUIDANCE[type as keyof typeof TYPE_SPECIFIC_GUIDANCE];
}

function getSynthesisTemplate(type?: string, options?: string[]): string {
  const opts = options || ['Option A', 'Option B'];
  if (!type || !(type in SYNTHESIS_TEMPLATES)) {
    return SYNTHESIS_TEMPLATES.DEFAULT(opts);
  }
  return SYNTHESIS_TEMPLATES[type as keyof typeof SYNTHESIS_TEMPLATES](opts);
}

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
    // Fallback if no previous content available
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

// Calculate cost for a specific model
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
    return { isValid: true }; // Fail open to avoid blocking
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
    return { isValid: true }; // Fail open
  }
}

// ============================================================================
// MAIN API ROUTE
// ============================================================================

export async function POST(req: Request) {
  try {
    // ========================================================================
    // 1. AUTHENTICATION & INPUT VALIDATION
    // ========================================================================
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await ensureConnection();

    const body = await req.json();
    let analysis = body.analysis;
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
      previousAgentStance,
      previousAgentName,
    } = body;

    // ========================================================================
    // 2. BUDGET CHECK
    // ========================================================================
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

    // ========================================================================
    // 3. API KEY CHECK
    // ========================================================================
    const apiKey = await getApiKeyForUser(session.user.id, session.user.email || undefined);
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

    // ========================================================================
    // 4. RATE LIMITING (Free Tier Only)
    // ========================================================================
    const isUsingSystemKey = apiKey === process.env.OPENAI_API_KEY;
    if (isUsingSystemKey) {
      const dailyKey = keys.userDailyMessages(session.user.id);
      const currentCountStr = await redis.get(dailyKey);
      const currentCount = parseInt(currentCountStr || "0", 10);

      if (countAsUserMessage) {
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
    }

    // ========================================================================
    // 5. SPECIAL VALIDATION ENDPOINTS
    // ========================================================================

    // Validate position defense
    if (debateTurn === 'validate') {
      const contentToValidate = messages[messages.length - 1].content;
      const opposingPosition = options.find((o: string) => o !== targetPosition);

      const validation = await validatePositionDefense(
        openai,
        contentToValidate,
        targetPosition,
        opposingPosition
      );

      return new Response(JSON.stringify(validation), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate synthesis neutrality
    if (debateTurn === 'validate-synthesis') {
      const contentToValidate = messages[messages.length - 1].content;

      const validation = await validateSynthesisNeutrality(
        openai,
        contentToValidate,
        options
      );

      return new Response(JSON.stringify(validation), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ========================================================================
    // 6. TRACK EVENT
    // ========================================================================
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

    // ========================================================================
    // 7. BUILD SYSTEM PROMPT
    // ========================================================================
    const isSummary = debateTurn === 'summary';

    // 🔍 DEBUG LOGGING FOR SYNTHESIS
    if (isSummary) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 SYNTHESIS DEBUG - RECEIVED DATA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Analysis Type:', analysis?.type || 'MISSING');
      console.log('Options:', JSON.stringify(options));
      console.log('Has Analysis:', !!analysis);
      console.log('Question (first 100 chars):', messages[0]?.content?.substring(0, 100));

      // Detect if this should be financial
      const containsMoney = options?.some((o: string) => /\$|dollar|money|income/i.test(o));
      console.log('Contains $ in options:', containsMoney);

      if (containsMoney && analysis?.type !== 'FINANCIAL') {
        console.warn('⚠️ WARNING: Question has $ but type is not FINANCIAL!');
        console.warn('⚠️ Forcing type to FINANCIAL');
        analysis = { ...analysis, type: 'FINANCIAL' };
      }

      console.log('Final Type for Template:', analysis?.type);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }


    const typeGuidance = getTypeGuidance(analysis?.type);
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
📏 LENGTH LIMIT: ${isSummary ? '150 WORDS' : '100 WORDS'} MAX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rules:
- Each point: 1-2 sentences maximum
- Use bold **headers** for each argument
- Be punchy and direct
- No fluff, no filler

Good: "**Trust matters.** Customers respect honesty. Hidden pricing feels like a trap."
Bad: "Pricing transparency is fundamentally important because it builds trust with customers by demonstrating honesty..."`;

    // Build final system prompt

// 🔍 DEBUG LOGGING FOR TEMPLATE
    if (isSummary) {
      const template = getSynthesisTemplate(analysis?.type, options);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TEMPLATE DEBUG');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Template Type Used:', analysis?.type || 'DEFAULT');
      console.log('Template Preview (first 300 chars):');
      console.log(template.substring(0, 300) + '...');
      console.log('Template contains "Critical Numbers":', template.includes('Critical Numbers'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }


    const systemPrompt = isSummary
      ? getSynthesisTemplate(analysis?.type, options)
      : `${agent.persona || "You are a debate participant."}

${agentStyle}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 DEBATE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: ${phase || 'DISCUSSION'}
Round: ${round || 1}

${phaseInstruction}

${positionEnforcement}

${typeGuidance}

${argumentMemory}

${verbosityLimit}`;

    // ========================================================================
    // 8. BUILD MESSAGE HISTORY WITH POSITION ANNOTATIONS
    // ========================================================================
    const annotatedHistory = conversationHistory.map((msg: any) => {
      // Annotate each message with stance to reinforce position memory
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

    // ========================================================================
    // 9. STREAM RESPONSE
    // ========================================================================
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