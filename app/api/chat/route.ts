import { OpenAI } from "openai";

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages, agent, conversationHistory } = await req.json();

    // Validate required fields
    if (!messages || !agent) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Build the conversation context for OpenAI
    const openaiMessages = [
      {
        role: "system" as const,
        content: agent.persona || "You are a helpful AI assistant.",
      },
      // Include previous conversation history
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      })),
      // Add the new user message
      {
        role: "user" as const,
        content: messages[messages.length - 1].content,
      },
    ];

    // Call OpenAI API with streaming
    const response = await openai.chat.completions.create({
      model: agent.model || "gpt-4o-mini",
      messages: openaiMessages,
      temperature: agent.temperature ?? 0.7,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return new Response("Invalid API key", { status: 401 });
    }

    if (error?.status === 429) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    return new Response(error?.message || "Internal server error", {
      status: 500,
    });
  }
}
