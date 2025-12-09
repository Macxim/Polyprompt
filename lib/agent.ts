// lib/agent.ts
import { groqClient } from "./groq";

export const runAgent = async (
  persona: string | undefined,
  userMessage: string
) => {
  try {
    const systemPrompt = persona || "You are a helpful assistant.";

    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message?.content ?? "";
  } catch (err) {
    console.error("Agent route error:", err);
    throw err;
  }
};
