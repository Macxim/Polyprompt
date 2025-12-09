"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { Message } from "../../../../types";

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

    // Dispatch automatic agent replies
    const spaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));

    spaceAgents.forEach((agent) => {
      const agentMessage: Message = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        role: "agent",
        content: agent.persona || `Hello, I'm ${agent.name}!`,
      };
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          spaceId,
          conversationId: convId,
          message: agentMessage,
        },
      });
    });

    setNewMessage("");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{conversation.title}</h1>

      <div className="space-y-2 mb-4">
        {conversation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded max-w-xs ${
              msg.role === "user"
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-200 text-black mr-auto"
            }`}
          >
            {msg.content}
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
