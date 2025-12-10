import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "../../../lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { name, persona, description, history } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        { error: "No history provided" },
        { status: 400 }
      );
    }

    // Call Groq agent (returns a stream now)
    const stream = await runAgent(name, persona, description, history);

    // Create a ReadableStream from the OpenAI stream
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Agent API error:", err);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
