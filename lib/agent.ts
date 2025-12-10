// lib/agent.ts
import { groqClient } from "./groq";

export const runAgent = async (
  name: string | undefined,
  persona: string | undefined,
  description: string | undefined,
  history: { role: string; content: string; agentName?: string }[]
) => {
  try {
    const systemPrompt =
      (name ? `You are ${name}. ` : "") +
      (persona || "You are a helpful assistant.") +
      (description ? `\n\nAbout you: ${description}` : "");

    // Format the conversation history as a transcript for the model
    const transcript = history.map(msg => {
      const speaker = msg.role === "user" ? "User" : (msg.agentName || "Agent");
      return `${speaker}: ${msg.content}`;
    }).join("\n");

    const fullPrompt = `${transcript}\n\n(Reply to the conversation above as ${name || "the agent"})`;

    const response = await groqClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
      temperature: 0.7,
      stream: true, // Enable streaming
    });

    return response;
  } catch (err) {
    console.error("Agent route error:", err);
    throw err;
  }
};
