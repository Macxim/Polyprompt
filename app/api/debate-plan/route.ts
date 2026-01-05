import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";

export const runtime = "nodejs";

// ============================================================================
// QUESTION ANALYSIS
// ============================================================================

interface QuestionAnalysis {
  type:
    | "FINANCIAL"
    | "CAREER"
    | "RELATIONSHIP"
    | "TECHNOLOGY"
    | "BUSINESS"
    | "LIFESTYLE"
    | "GENERAL";
  options: string[];
  characteristics: {
    hasNumbers: boolean;
    isUrgent: boolean;
    isLongTerm: boolean;
    hasEmotionalWords: boolean;
    mentionsFamily: boolean;
  };
}

function analyzeQuestion(prompt: string): QuestionAnalysis {
  const lowerPrompt = prompt.toLowerCase();

  const typeKeywords: Record<string, string[]> = {
    FINANCIAL: [
      "$",
      "money",
      "salary",
      "investment",
      "cost",
      "price",
      "income",
      "equity",
      "stock",
      "bitcoin",
      "crypto",
      "loan",
      "debt",
    ],
    CAREER: [
      "job",
      "career",
      "work",
      "boss",
      "company",
      "startup",
      "promotion",
      "quit",
      "fired",
      "hire",
      "interview",
    ],
    RELATIONSHIP: [
      "relationship",
      "dating",
      "marry",
      "breakup",
      "divorce",
      "partner",
      "girlfriend",
      "boyfriend",
      "spouse",
    ],
    TECHNOLOGY: [
      "software",
      "framework",
      "programming",
      "tech stack",
      "tool",
      "app",
      "platform",
      "react",
      "vue",
      "python",
      "javascript",
    ],
    BUSINESS: [
      "business",
      "startup",
      "founder",
      "b2b",
      "b2c",
      "product",
      "launch",
      "pivot",
      "market",
      "customer",
    ],
    LIFESTYLE: [
      "move",
      "city",
      "house",
      "apartment",
      "location",
      "neighborhood",
      "commute",
      "live",
    ],
  };

  let detectedType: QuestionAnalysis["type"] = "GENERAL";
  let maxMatches = 0;

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    const matches = keywords.filter((kw) =>
      lowerPrompt.includes(kw)
    ).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedType = type as QuestionAnalysis["type"];
    }
  }

  // Extract options (X or Y)
  const orPattern = /(.+?)\s+(?:or|vs\.?)\s+(.+?)(?:\?|$)/i;
  const match = prompt.match(orPattern);

  const options = match
    ? [
        match[1]
          .replace(/^(should i|do i|is it better to|can i)/i, "")
          .trim(),
        match[2].trim(),
      ]
    : [];

  return {
    type: detectedType,
    options,
    characteristics: {
      hasNumbers: /\d/.test(prompt),
      isUrgent: /\b(now|immediately|today|urgent|asap)\b/i.test(prompt),
      isLongTerm: /\b(future|years|decades|forever|lifetime|long-term)\b/i.test(
        prompt
      ),
      hasEmotionalWords:
        /\b(love|hate|scared|excited|worried|anxious)\b/i.test(prompt),
      mentionsFamily:
        /\b(family|kids|children|spouse|wife|husband|parent)\b/i.test(prompt),
    },
  };
}

// ============================================================================
// DEBATE PLAN GENERATOR
// ============================================================================

export async function POST(req: Request) {
  try {
    // ------------------------------------------------------------------------
    // AUTH
    // ------------------------------------------------------------------------

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, agents } = await req.json();

    if (!prompt || !Array.isArray(agents) || agents.length < 2) {
      return NextResponse.json(
        { error: "Debate requires a prompt and at least 2 agents." },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // API KEY
    // ------------------------------------------------------------------------

    const apiKey = await getApiKeyForUser(
      session.user.id,
      session.user.email || undefined
    );

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "API Key Required",
          message: "Please add your OpenAI API key in Settings.",
        },
        { status: 403 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // ------------------------------------------------------------------------
    // ANALYSIS
    // ------------------------------------------------------------------------

    const analysis = analyzeQuestion(prompt);

    // ------------------------------------------------------------------------
    // DIRECTOR PROMPT (unchanged)
    // ------------------------------------------------------------------------


const directorPrompt = `You are the "Lean Debate Director" - an expert at orchestrating high-quality, concise debates.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUESTION TO DEBATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"${prompt}"

Question Type: ${analysis.type}
${analysis.characteristics.hasNumbers ? "💰 Contains numbers - this is quantifiable" : ""}
${analysis.characteristics.isUrgent ? "🚨 Time-sensitive decision" : ""}
${analysis.characteristics.isLongTerm ? "⏰ Long-term implications" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 AVAILABLE AGENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${agents
  .map((a: any, i: number) =>
    `${i + 1}. ${a.name} (ID: ${a.id})
   Persona: ${a.persona.substring(0, 100)}...`
  )
  .join("\n\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a LEAN, HIGH-IMPACT debate plan with EXACTLY 5 TURNS:

STRUCTURE (NON-NEGOTIABLE):
- Turn 1-2: OPENING (Round 1) - Two agents state opposing positions
- Turn 3-4: REBUTTAL (Round 2) - Same agents attack each other's arguments
- Turn 5: SYNTHESIS (Round 3) - Neutral wrap-up with decision criteria

CRITICAL DIRECTOR RULES:

1️⃣ IDENTIFY TWO CLEAR OPTIONS
   - Extract the two options being compared from the question
   - Make them specific and actionable
   - Example: "$1000/week for life" vs "$1 million lump sum now"

2️⃣ ASSIGN CONSISTENT POSITIONS
   - Agent A defends Option 1 in BOTH Round 1 and Round 2
   - Agent B defends Option 2 in BOTH Round 1 and Round 2
   - Agents NEVER switch sides
   - Example:
     ✅ CORRECT: Strategic Analyst defends Option A in turns 1 AND 3
     ❌ WRONG: Strategic Analyst defends Option A in turn 1, then Option B in turn 3

3️⃣ ENFORCE BREVITY
   - Instruct each agent to keep responses to 100 words MAX
   - Synthesis: 150 words MAX
   - Use phrase: "Keep response under 100 words. Be punchy and direct."

4️⃣ TYPE-SPECIFIC INSTRUCTIONS
   ${getTypeSpecificDirectorGuidance(analysis.type)}

5️⃣ ROUND 2 MUST REFERENCE ROUND 1
   - In Round 2, agents must ATTACK specific claims from Round 1
   - Instruction should include: "Attack [opponent]'s claim that..."
   - NOT generic: "defend your position"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "options": ["Option A Name", "Option B Name"],
  "plan": [
    {
      "round": 1,
      "phase": "OPENING",
      "agentId": "agent_id_here",
      "targetPosition": "Option A Name",
      "instruction": "Make your 100-word opening case for [Option A]. Be specific and opinionated. Example: Focus on [specific benefit]. Avoid: generic statements.",
      "type": "discussion"
    },
    {
      "round": 1,
      "phase": "OPENING",
      "agentId": "different_agent_id",
      "targetPosition": "Option B Name",
      "instruction": "Make your 100-word opening case for [Option B]. Be specific and opinionated.",
      "type": "discussion"
    },
    {
      "round": 2,
      "phase": "CONFRONTATION",
      "agentId": "first_agent_id_again",
      "targetPosition": "Option A Name",
      "instruction": "Attack [Agent B]'s claim that [specific claim from their opening]. Defend [Option A] by showing why [specific counterpoint]. Under 100 words.",
      "type": "discussion",
      "respondingToStepIndex": 1
    },
    {
      "round": 2,
      "phase": "CONFRONTATION",
      "agentId": "second_agent_id_again",
      "targetPosition": "Option B Name",
      "instruction": "Attack [Agent A]'s claim that [specific claim]. Defend [Option B] with [specific counter]. Under 100 words.",
      "type": "discussion",
      "respondingToStepIndex": 0
    },
    {
      "round": 3,
      "phase": "SYNTHESIS",
      "agentId": "any_agent_id",
      "targetPosition": null,
      "instruction": "Provide neutral synthesis: 'Choose [Option A] if: [conditions]. Choose [Option B] if: [conditions].' Include numbers if financial question. Under 150 words.",
      "type": "summary"
    }
  ]
}

CRITICAL VALIDATION CHECKLIST:
✓ Exactly 5 turns
✓ Exactly 2 rounds of debate + 1 synthesis
✓ Agent positions NEVER change (check agentId consistency with targetPosition)
✓ Options are specific, not generic
✓ Instructions reference specific points to attack in Round 2
✓ Word limits specified in each instruction`;

    // ------------------------------------------------------------------------
    // GENERATE PLAN
    // ------------------------------------------------------------------------

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: directorPrompt },
        { role: "user", content: "Generate the debate plan." },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    let data: any;

    try {
      if (!content || typeof content !== "string") {
        throw new Error("Empty model response");
      }

      data = JSON.parse(content);

      // ----------------------------------------------------------------------
      // STRUCTURAL VALIDATION
      // ----------------------------------------------------------------------

      if (!Array.isArray(data.options) || data.options.length !== 2) {
        throw new Error("Options must be an array of exactly 2 items");
      }

      if (!Array.isArray(data.plan)) {
        throw new Error("Plan must be an array");
      }

      const debateSteps = data.plan.filter(
        (step: any) => step?.type !== "summary"
      );

      if (debateSteps.length !== 4) {
        throw new Error(
          `Expected 4 debate turns (excluding summary), got ${debateSteps.length}`
        );
      }

      if (data.plan.length !== 5) {
        throw new Error(`Plan must contain exactly 5 total steps`);
      }

      // ----------------------------------------------------------------------
      // AGENT POSITION CONSISTENCY
      // ----------------------------------------------------------------------

      const agentPositions = new Map<string, string>();

      for (const step of debateSteps) {
        if (!step.agentId || !step.targetPosition) {
          throw new Error(
            "Each debate step must include agentId and targetPosition"
          );
        }

        const previous = agentPositions.get(step.agentId);

        if (previous && previous !== step.targetPosition) {
          throw new Error(
            `Agent ${step.agentId} switched position from "${previous}" to "${step.targetPosition}"`
          );
        }

        agentPositions.set(step.agentId, step.targetPosition);
      }

      // ----------------------------------------------------------------------
      // DEBUG (POST-VALIDATION ONLY)
      // ----------------------------------------------------------------------

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔍 PLAN VALIDATION PASSED");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Options:", data.options);
      console.log("Agent Positions:", Array.from(agentPositions.entries()));
      console.log("Question Type:", analysis.type);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } catch (err) {
      console.error("❌ PLAN VALIDATION FAILED");
      console.error(content);

      return NextResponse.json(
        {
          error: "Failed to generate valid plan",
          details: (err as Error).message,
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------------
    // RETURN
    // ------------------------------------------------------------------------

    return NextResponse.json({
      ...data,
      analysis: {
        type: analysis.type,
        characteristics: analysis.characteristics,
      },
    });
  } catch (error: any) {
    console.error("Debate plan API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate plan" },
      { status: 500 }
    );
  }
}

// ============================================================================
// TYPE-SPECIFIC DIRECTOR GUIDANCE (UNCHANGED)
// ============================================================================

function getTypeSpecificDirectorGuidance(type: string): string {
  const guidance: Record<string, string> = {
    FINANCIAL: `For FINANCIAL questions:
- Options should include specific dollar amounts if mentioned
- Synthesis MUST include calculations (breakeven, ROI, annual returns)
- Instruct agents to use concrete numbers, not vague "grows over time"
- Example instruction: "Calculate: $1M at 7% = $70k/year vs $52k/year weekly"`,

    CAREER: `For CAREER questions:
- Synthesis must consider life stage (age, dependents)
- Include risk assessment based on savings/obligations
- Focus on 5-year trajectory, not just immediate benefits
- Example: "If under 30 with 6mo savings" not "if you value growth"`,

    RELATIONSHIP: `For RELATIONSHIP questions:
- Tone must be empathetic and non-judgmental
- Distinguish fixable issues from deal-breakers
- Synthesis should include self-reflection prompts
- MUST include disclaimer about seeking professional help`,

    TECHNOLOGY: `For TECH questions:
- Include job market data (demand, salaries)
- Mention ecosystem maturity and learning curve
- Be specific: "React has 3x more jobs" not "React is popular"`,

    BUSINESS: `For BUSINESS questions:
- Focus on market dynamics, unit economics, scalability
- Consider competitive positioning and defensibility
- Address execution risk and founder capabilities`,

    LIFESTYLE: `For LIFESTYLE questions:
- Focus on values alignment and quality of life
- Consider practical constraints (cost, commute, social)
- Provide concrete decision criteria based on priorities`
  };

  return guidance[type] || `For GENERAL questions:
- Keep debate focused on core tradeoffs
- Provide specific decision criteria in synthesis
- Avoid vague "it depends" conclusions`;
}