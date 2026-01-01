import { OpenAI } from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeyForUser } from "@/lib/get-api-key";
import posthog from "@/lib/posthog";
import { keys, redis } from "@/lib/redis";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, agent, conversationHistory } = await req.json();

    // --- PHASE 2: BUDGET CHECK ---
    const BUDGET_LIMIT = 30.0;
    const currentSpendStr = await redis.get(keys.systemSpend);
    const currentSpend = parseFloat(currentSpendStr || "0");

    if (currentSpend >= BUDGET_LIMIT) {
      return new Response(JSON.stringify({
        error: "Monthly Budget Reached",
        message: "The system's OpenAI budget has been reached for this month. Please contact the administrator."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    // ----------------------------

    // Track message sent
    posthog.capture({
      distinctId: session.user.id,
      event: 'chat_message_sent',
      properties: {
        agent_id: agent.id,
        agent_name: agent.name,
        model: agent.model || "gpt-4o-mini",
        message_length: messages[messages.length - 1].content.length
      }
    });

    // Get user-specific or system API key (admin only)
    const apiKey = await getApiKeyForUser(session.user.id, session.user.email || undefined);

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "API Key Required",
        message: "Please add your OpenAI API key in Settings to use this feature."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const openai = new OpenAI({ apiKey });

    // Validate required fields
    if (!messages || !agent) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Build the verbosity instructions
    const verbosityMap = {
      concise: "Keep responses brief and punchy. Use short paragraphs.",
      balanced: "Provide thoughtful responses but keep them concise. Use short paragraphs (2-3 sentences max) for readability.",
      detailed: "Give comprehensive responses. IMPORTANT: Break text into many short paragraphs to avoid walls of text."
    };
    const verbosityInstruction = verbosityMap[agent.verbosity as keyof typeof verbosityMap] || verbosityMap.balanced;

    // Build the conversation context for OpenAI
    const openaiMessages = [
      {
        role: "system" as const,
        content: `${agent.persona || "You are a helpful AI assistant."}\n\nIMPORTANT: ${verbosityInstruction}\n\nFORMATTING RULES:\n- Use short paragraphs (max 2-3 sentences).\n- Use lists and headers where appropriate to break up text.\n- Avoid huge blocks of text.`,
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

    // Call OpenAI API with streaming and usage tracking
    const selectedModel = agent.model || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: openaiMessages,
      temperature: agent.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true }, // Request usage data in stream
    });

    // Create a readable stream for the response
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

            // Capture token usage from the final chunk
            if (chunk.usage) {
              tokenUsage = {
                prompt: chunk.usage.prompt_tokens,
                completion: chunk.usage.completion_tokens,
                total: chunk.usage.total_tokens,
              };
            }
          }

          // --- PHASE 2: CALCULATE AND UPDATE SPEND ---
          if (tokenUsage) {
            // Pricing per 1M tokens (Nov 2024 ballpark)
            // gpt-4o-mini: $0.150 / 1M input, $0.600 / 1M output
            // gpt-4o: $2.50 / 1M input, $10.00 / 1M output
            let cost = 0;
            if (selectedModel.includes("gpt-4o-mini")) {
              cost = (tokenUsage.prompt * 0.15 / 1000000) + (tokenUsage.completion * 0.60 / 1000000);
            } else if (selectedModel.includes("gpt-4o")) {
              cost = (tokenUsage.prompt * 2.50 / 1000000) + (tokenUsage.completion * 10.00 / 1000000);
            } else {
              // Default to mini pricing if unknown
              cost = (tokenUsage.prompt * 0.15 / 1000000) + (tokenUsage.completion * 0.60 / 1000000);
            }

            if (cost > 0) {
              await redis.incrByFloat(keys.systemSpend, cost);
            }

            // Send token usage as a special marker at the end
            controller.enqueue(encoder.encode(`\n__TOKENS__${JSON.stringify(tokenUsage)}`));
          }
          // -------------------------------------------

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
