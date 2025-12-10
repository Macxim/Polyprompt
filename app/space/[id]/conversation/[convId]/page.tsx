"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { Message } from "../../../../types";
import ReactMarkdown from "react-markdown";

export default function ConversationPage() {
  const { state, dispatch } = useApp();
  const params = useParams();
  const [newMessage, setNewMessage] = useState("");

  // Validate params
  if (
    !params.id ||
    Array.isArray(params.id) ||
    !params.convId ||
    Array.isArray(params.convId)
  ) {
    return <p>Invalid conversation URL</p>;
  }

  const spaceId = params.id;
  const convId = params.convId;

  // Find the space and conversation from global state
  const space = state.spaces.find((s) => s.id === spaceId);
  const conversation = space?.conversations.find((c) => c.id === convId);

  if (!space || !conversation) return <p>Conversation not found.</p>;

  // Handle sending a new message
  const handleSend = () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      role: "user",
      content: newMessage,
      agentName: "User", // Explicitly label user
    };

    // Dispatch user message
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        spaceId,
        conversationId: convId,
        message: userMessage,
      },
    });

    setNewMessage("");

    // Dispatch automatic agent replies
    const spaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));

    // Construct history including the new user message
    const currentHistory = [...conversation.messages, userMessage];

    spaceAgents.forEach(async (agent) => {
      // 1. Create a placeholder message for loading state (optional, or just wait)
      // For now, let's just wait and add the message when ready.
      // Or better: Add a "typing..." indicator?
      // User didn't ask for typing, just "real agent".

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: agent.name,
            persona: agent.persona,
            description: agent.description,
            history: currentHistory.map(m => ({
              role: m.role,
              content: m.content,
              agentName: m.agentName // Pass the name so backend can transcript it
            }))
          })
        });

        if (!res.ok) throw new Error("Agent failed to reply");

        const data = await res.json();

        const agentMessage: Message = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          role: "agent",
          content: data.content || "I couldn't think of anything to say.",
          agentId: agent.id,
          agentName: agent.name,
        };

        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            spaceId,
            conversationId: convId,
            message: agentMessage,
          },
        });
      } catch (error) {
        console.error("Agent fetch error", error);
        // Optionally dispatch an error message
      }
    });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{conversation.title}</h1>

      <div className="space-y-4 mb-4">
        {conversation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-lg w-full ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 border border-gray-200"
            }`}
          >
            {msg.agentName && msg.role === "agent" && (
              <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                {msg.agentName}
              </div>
            )}
            {msg.agentName === "User" && (
              <div className="text-xs font-bold text-blue-200 mb-1 uppercase tracking-wider">
                You
              </div>
            )}

            <div className={`prose ${msg.role === "user" ? "prose-invert" : ""} max-w-none prose-p:leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-li:my-1`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="border p-2 rounded flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
