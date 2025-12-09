// lib/agent.ts
import { groqClient } from "./groq";

export const runAgent = async (
  name: string | undefined,
  persona: string | undefined,
  description: string | undefined,
  userMessage: string
) => {
  try {
    const systemPrompt =
      (name ? `You are ${name}. ` : "") +
      (persona || "You are a helpful assistant.") +
      (description ? `\n\nAbout you: ${description}` : "");

    const response = await groqClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
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
