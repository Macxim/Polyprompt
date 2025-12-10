"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { Message } from "../../../../types";
import ReactMarkdown from "react-markdown";

export default function ConversationPage() {
  const { state, dispatch } = useApp();
  const params = useParams();
  const router = useRouter();
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
      {/* Header with navigation and delete */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/space/${spaceId}`)}
          className="text-slate-500 hover:text-indigo-600 text-sm font-medium mb-4 flex items-center gap-1 transition-colors"
        >
          ← Back to Space
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">{conversation.title}</h1>
          <button
            onClick={() => {
              if (confirm(`Delete conversation "${conversation.title}"?`)) {
                dispatch({
                  type: "DELETE_CONVERSATION",
                  payload: { spaceId, conversationId: convId },
                });
                dispatch({
                  type: "SET_BANNER",
                  payload: { message: "Conversation deleted." },
                });
                router.push(`/space/${spaceId}`);
              }
            }}
            className="px-4 py-2 bg-white border border-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-200 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
            Delete
          </button>
        </div>
      </div>

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
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
          Send
        </button>
      </div>
    </div>
  );
}
