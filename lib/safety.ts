import { OpenAI } from "openai";

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  alternativeResponse?: string;
}

export interface QualityCheckResult {
  debatable: boolean;
  reason?: string;
  suggestion?: string;
  category?: 'trivial' | 'nonsensical' | 'already_decided' | 'not_actionable' | 'good';
}

export const SAFETY_SYSTEM_PROMPT = `You are a safety classifier. Determine if a question is SAFE or UNSAFE for debate/discussion.

UNSAFE questions include (AUTO-REJECT):
1. **Self-harm & Suicide**: Any question about ending one's life, self-harm, or suicide methods
2. **Violence**: Harming others, weapons for harm, planning attacks
3. **Illegal Activities**: Drug manufacturing, fraud, hacking for malicious purposes
4. **Child Safety**: Anything that could endanger children
5. **Extreme Medical**: "Should I stop taking my medication?", dangerous health decisions
6. **Hate Speech**: Discrimination, promoting hatred against groups

SAFE questions include:
- Career choices, lifestyle decisions, product comparisons
- Philosophical debates, ethical dilemmas (abstract)
- Business strategy, technology choices
- Personal development, habits, routines
- Creative projects, hobbies

EDGE CASES:
- "Should I eat churros?" → SAFE (food choice)
- "Should I quit my job?" → SAFE (career decision)
- "Should I tell my friend the truth?" → SAFE (ethical dilemma)
- "Should I jump off a bridge?" → UNSAFE (suicide implication)
- "Should I confront my bully?" → SAFE if abstract, UNSAFE if violent intent detected

Respond with ONLY a JSON object:
{
  "safe": true,
  "reason": "This is a standard decision-making question"
}

OR

{
  "safe": false,
  "reason": "This question involves suicide/self-harm",
  "alternativeResponse": "If you're experiencing thoughts of self-harm or suicide, please reach out for help immediately. Your life matters, and these feelings can change with the right support."
}`;

export const QUALITY_SYSTEM_PROMPT = `You are a question quality analyzer. Determine if a question is worth debating.

REJECT these question types:

1. **TRIVIAL / SILLY** (no real stakes):
   - "Should I wear socks today?"
   - "Is water wet?"
   - "Should I blink?"
   → These have no meaningful consequences

2. **NONSENSICAL / GIBBERISH**:
   - "Blah blah should I xyz?"
   - "asdfasdf or qwerty?"
   - Questions that make no sense

3. **ALREADY DECIDED / PAST EVENTS**:
   - "Should I have eaten that yesterday?"
   - "Was I right to quit my job last year?"
   → Can't change the past, not actionable

4. **NOT ACTIONABLE / TOO VAGUE**:
   - "Should I be happy?"
   - "Should I exist?"
   - "Should things be different?"
   → No clear decision to make

5. **OBVIOUS ANSWERS / NO DEBATE**:
   - "Should I breathe?"
   - "Should I drink water?"
   - "2+2=4?"

ACCEPT these question types:

✅ **GENUINE DECISIONS** (real stakes, future-focused):
   - "Should I eat churros?" (health vs pleasure tradeoff)
   - "Should I quit my job?" (career decision)
   - "Python or JavaScript?" (learning path)
   - "Should I move to another city?" (life change)
   - "Should I tell my friend the truth?" (ethical dilemma)

✅ **COMPARATIVE CHOICES**:
   - "X or Y?" with real alternatives
   - "Which is better for Z?"

✅ **EXPLORATORY QUESTIONS** (worth analyzing):
   - "Is remote work good for me?"
   - "Should I start a business?"

Respond with ONLY a JSON object:

GOOD question:
{
  "debatable": true,
  "category": "good",
  "reason": "This involves a real decision with tradeoffs"
}

BAD question:
{
  "debatable": false,
  "category": "trivial",
  "reason": "This question has no meaningful stakes",
  "suggestion": "Try asking about a decision with real consequences, like 'Should I change careers?' or 'Which programming language should I learn?'"
}`;

export const CRISIS_RESOURCES = {
  us: {
    phone: "988",
    text: "741741",
    textBody: "HOME"
  },
  international: "https://findahelpline.com",
  message: `If you're experiencing thoughts of self-harm or suicide, please reach out for help immediately. Your life matters, and these feelings can change with the right support.`
};

export async function checkQuestionSafety(
  openai: OpenAI,
  question: string
): Promise<SafetyCheckResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SAFETY_SYSTEM_PROMPT },
        { role: "user", content: `Question: "${question}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content || '{"safe": true}';
    const result = JSON.parse(content);

    if (!result.safe && !result.alternativeResponse) {
      result.alternativeResponse = CRISIS_RESOURCES.message;
    }

    return result;
  } catch (error) {
    console.error("Safety check failed:", error);
    return { safe: true, reason: "Safety check error - defaulting to safe" };
  }
}

export async function checkQuestionQuality(
  openai: OpenAI,
  question: string
): Promise<QualityCheckResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: QUALITY_SYSTEM_PROMPT },
        { role: "user", content: `Question: "${question}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content || '{"debatable": true}';
    const result = JSON.parse(content);

    return result;
  } catch (error) {
    console.error("Quality check failed:", error);
    return { debatable: true, reason: "Quality check error - defaulting to allow" };
  }
}

export function getSafetyErrorResponse(result: SafetyCheckResult) {
  return {
    error: "Unsafe Question",
    message: result.alternativeResponse || CRISIS_RESOURCES.message,
    reason: result.reason,
    unsafe: true,
    resources: CRISIS_RESOURCES
  };
}

export function getQualityErrorResponse(result: QualityCheckResult) {
  return {
    error: "Question Not Debatable",
    message: result.suggestion || "This question doesn't lend itself to meaningful debate. Try asking about a decision with real stakes or tradeoffs.",
    reason: result.reason,
    category: result.category,
    lowQuality: true
  };
}
