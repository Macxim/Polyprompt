import OpenAI from "openai";

export const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "dummy-key",
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true, // Only if needed in client, though agent.ts is usually server-side
});
