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
    // This allows the model to see who said what
    const transcript = history.map(msg => {
      const speaker = msg.role === "user" ? "User" : (msg.agentName || "Agent");
      return `${speaker}: ${msg.content}`;
    }).join("\n");

    // We append the transcript to the user message to give full context
    // The "userMessage" is technically the last item in history, but we'll specificy the prompt structure clearly.
    // Actually, we can just pass the transcript as the "user" content, asking the agent to reply.

    // Let's assume the last message in history is the one we are replying to,
    // or simply provide the whole transcript and ask for a reply.
    const fullPrompt = `${transcript}\n\n(Reply to the conversation above as ${name || "the agent"})`;

    const response = await groqClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message?.content ?? "";
  } catch (err) {
    console.error("Agent route error:", err);
    throw err;
  }
};
