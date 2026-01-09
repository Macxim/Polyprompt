import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// ============================================================================
// SIMPLIFIED QUESTION ANALYSIS
// ============================================================================

interface QuestionAnalysis {
  options: string[];
}

/**
 * Extract options from a "X or Y" style question.
 * Type detection has been removed - the universal prompt handles all types.
 */
function analyzeQuestion(prompt: string): QuestionAnalysis {
  const orPattern = /(.+?)\s+(?:or|vs\.?)\s+(.+?)(?:\?|$)/i;
  const match = prompt.match(orPattern);

  const options = match
    ? [
        match[1]
          .replace(/^(should i|do i|is it better to|can i|what if i)/i, "")
          .trim(),
        match[2].trim(),
      ]
    : [];

  return { options };
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
    let userId = session?.user?.id;

    // Optional Auth & Rate Limiting (if not signed in)
    if (!userId) {
      // Get IP
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";

      const { success, remaining } = await checkRateLimit(ip);

      if (!success) {
        return NextResponse.json(
          {
            error: "Daily Limit Reached",
            message: "You've used your 3 free questions for today. Sign in for more.",
          },
          { status: 429 }
        );
      }

      // Assign temporary ID for unauth users to allow flow to continue (though getApiKey will return null/sys key)
      userId = `guest-${ip}`;
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
      session?.user?.id || "", // Pass empty if no session, getApiKeyForUser should handle it or we use fallback handling below
      session?.user?.email || undefined
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
    // ANALYSIS (Open vs Comparative)
    // ------------------------------------------------------------------------

    const typeDetection = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze if a question is OPEN (exploring one thing) or COMPARATIVE (choosing between options).

OPEN questions: "Should I...", "What about...", "Is X good...", "Tell me about...", "Pros and cons of X"
COMPARATIVE questions: "X or Y?", "Which is better...", "Should I choose X or Y...", "Pros/cons of X vs Y"

Respond with ONLY a JSON object: {"type": "open"} or {"type": "comparative"}`
        },
        { role: "user", content: `Question: "${prompt}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    });

    const typeData = JSON.parse(typeDetection.choices[0]?.message?.content || '{"type": "comparative"}');
    const isOpen = typeData.type === "open";

    // ------------------------------------------------------------------------
    // DIRECTOR PROMPT
    // ------------------------------------------------------------------------

const directorPrompt = `You are the "Lean Debate Director" - an expert at orchestrating high-quality, concise discussions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUESTION TO ANALYZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"${prompt}"

QUESTION TYPE: ${isOpen ? "OPEN (Exploring perspectives)" : "COMPARATIVE (Choosing between options)"}

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

Create a LEAN, HIGH-IMPACT discussion plan with EXACTLY 5 TURNS:

STRUCTURE (NON-NEGOTIABLE):
- Turn 1-2: OPENING (Round 1) - Two agents state their perspectives
- Turn 3-4: REBUTTAL/DEEPENING (Round 2) - Same agents interact with each other's points
- Turn 5: SYNTHESIS (Round 3) - Neutral wrap-up with decision criteria

CRITICAL DIRECTOR RULES:

1️⃣ IDENTIFY KEY PERSPECTIVES / OPTIONS
   ${isOpen
     ? "- Extract two distinct ANGLES or SUB-TOPICS to explore\n   - Example for 'Should I eat churros?': 'Immediate Pleasure/Tradition' vs 'Health/Long-term Impact'"
     : "- Extract the two OPTIONS being compared\n   - Example: '$1000/week for life' vs '$1 million lump sum now'"}

2️⃣ ASSIGN CONSISTENT POSITIONS
   - Agent A defends Angle/Option 1 in BOTH Round 1 and Round 2
   - Agent B defends Angle/Option 2 in BOTH Round 1 and Round 2
   - Agents NEVER switch sides

3️⃣ ENFORCE BREVITY
   - Instruct each agent to keep responses to 100 words MAX
   - Synthesis: 150 words MAX
   - Use phrase: "Keep response under 100 words. Be punchy and direct."

4️⃣ UNIVERSAL INTELLIGENCE INSTRUCTIONS
   ${getUniversalDirectorGuidance()}

5️⃣ ROUND 2 MUST REFERENCE ROUND 1
   - In Round 2, agents must interact with specific claims from Round 1
   - Instruction should include: "${isOpen ? "Deepen the analysis by addressing" : "Attack"} [opponent]'s claim that..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "options": ["Perspective A Name", "Perspective B Name"],
  "plan": [
    {
      "round": 1,
      "phase": "OPENING",
      "agentId": "agent_id_here",
      "targetPosition": "Perspective A Name",
      "instruction": "Make your 100-word opening case for [Perspective A]. Be specific and opinionated.",
      "type": "discussion"
    },
    {
      "round": 1,
      "phase": "OPENING",
      "agentId": "different_agent_id",
      "targetPosition": "Perspective B Name",
      "instruction": "Make your 100-word opening case for [Perspective B]. Be specific and opinionated.",
      "type": "discussion"
    },
    {
      "round": 2,
      "phase": "CONFRONTATION",
      "agentId": "first_agent_id_again",
      "targetPosition": "Perspective A Name",
      "instruction": "${isOpen ? "Address" : "Attack"} [Agent B]'s claim that [specific claim]. ${isOpen ? "Show why [Perspective A] provides a more critical lens on this." : "Defend [Perspective A] by showing why [specific counterpoint]."} Under 100 words.",
      "type": "discussion",
      "respondingToStepIndex": 1
    },
    {
      "round": 2,
      "phase": "CONFRONTATION",
      "agentId": "second_agent_id_again",
      "targetPosition": "Perspective B Name",
      "instruction": "${isOpen ? "Address" : "Attack"} [Agent A]'s claim that [specific claim]. ${isOpen ? "Show why [Perspective B] is the more important factor to consider." : "Defend [Perspective B] with [specific counter]."} Under 100 words.",
      "type": "discussion",
      "respondingToStepIndex": 0
    },
    {
      "round": 3,
      "phase": "SYNTHESIS",
      "agentId": "any_agent_id",
      "targetPosition": null,
      "instruction": "Provide neutral synthesis: 'Consider [Perspective A] if: [conditions]. Consider [Perspective B] if: [conditions].' Under 150 words.",
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

    return NextResponse.json({ ...data, isOpen });
  } catch (error: any) {
    console.error("Debate plan API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate plan" },
      { status: 500 }
    );
  }
}

// ============================================================================
// UNIVERSAL DIRECTOR GUIDANCE
// ============================================================================
function getUniversalDirectorGuidance(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTELLIGENT DEBATE DIRECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your job: Create a lean, high-impact debate plan where agents make SPECIFIC, MEASURABLE arguments.

DETECT WHAT MATTERS & INSTRUCT ACCORDINGLY:

💰 IF MONEY INVOLVED ($, salary, cost, income):
   → Instruct agents: "Calculate breakeven point", "Show ROI over X years", "Compare annual returns"
   → Synthesis MUST include: actual numbers, breakeven analysis, what the math says
   → Example: "$1M at 7% = $70k/year vs $52k/year. Breakeven: 19 years."

⏰ IF TIME INVOLVED (hours/week, work-life balance):
   → Instruct agents: "Calculate effective hourly rate", "Show opportunity cost over 5 years"
   → Synthesis MUST include: time-value calculations, productivity comparisons
   → Example: "$80k for 60hrs/week = $26/hr vs $50k for 30hrs/week = $32/hr"

👤 IF AGE/LIFE STAGE INVOLVED (career, retirement, family):
   → Instruct agents: Use specific age ranges and conditions
   → Synthesis MUST include: "If you're under 30...", "If you have dependents..."
   → Example: "Choose X if you're 40+ with kids. Choose Y if you're under 30 with 6mo savings."

📊 IF RISK INVOLVED (startup, investment, career change):
   → Instruct agents: "Cite failure rates", "Show historical outcomes", "Quantify downside"
   → Synthesis MUST include: probability, worst-case scenarios, risk mitigation
   → Example: "70% of startups fail. If you have no safety net, risk is too high."

🎯 IF COMPARING OPTIONS (X vs Y):
   → Instruct agents: "Provide concrete examples or data points for your side"
   → Synthesis MUST include: "Choose X if [measurable condition]. Choose Y if [measurable condition]."
   → Example: "Choose React if job hunting (3x more postings). Choose Vue if small team values simplicity."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL INSTRUCTION QUALITY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each agent instruction MUST be SPECIFIC and ACTIONABLE:

❌ BAD INSTRUCTIONS (TOO VAGUE):
   "Argue for stability and long-term thinking"
   "Discuss the benefits of your option"
   "Consider the tradeoffs"

✅ GOOD INSTRUCTIONS (SPECIFIC & MEASURABLE):
   "Argue $1000/week provides guaranteed $52k/year vs risky investment returns. Calculate total over 20 years."
   "Attack their claim that $1M grows wealth. 70% of lottery winners go broke. Cite this to show risk of mismanagement."
   "Calculate effective hourly rate: $80k/60hrs = $26/hr. Show this actually pays LESS per hour than lower salary job."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYNTHESIS INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The synthesis instruction MUST enforce specificity:

Template: "Provide neutral synthesis with CONCRETE decision criteria:
- Use age ranges: 'under 30', '65+', '40+ with kids'
- Use numbers: '6+ months savings', '3x more jobs', '$70k/year'
- Use measurable conditions: 'have dependents', 'work in law/finance', 'can invest at 7%'
- IF MONEY INVOLVED: MUST calculate and include: breakeven, ROI, annual amounts, compound growth
- Format: 'Choose [Option A] if: [concrete condition 1], [concrete condition 2]'
- Under 200 words"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES OF GOOD DEBATE PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: "$1000/week for life vs $1M lump sum?"

✅ GOOD Agent Instruction:
"Argue $1000/week = $52k/year guaranteed. Calculate total over 20 years ($1.04M). Show this eliminates investment risk and provides peace of mind for those who can't invest wisely. Under 100 words."

✅ GOOD Rebuttal Instruction:
"Attack their 'peace of mind' argument. If you can invest $1M at 7%, you earn $70k/year FOREVER, beating $52k/year. Show the math: after 20 years you have $3.87M vs their $1.04M. Under 100 words."

✅ GOOD Synthesis Instruction:
"Calculate breakeven (19 years). Show: Choose weekly if 65+ (may not reach breakeven) or have spending problems. Choose lump sum if under 50 and can invest at 7% returns. MUST include 'Critical Numbers' section with calculations."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remember: SPECIFICITY wins debates. Vague arguments lose debates.`;
}