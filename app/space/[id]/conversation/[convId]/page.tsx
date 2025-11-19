"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSpaces } from "../../../../context/SpaceContext";

export default function ConversationPage() {
  const params = useParams();
  const { spaces, addMessage } = useSpaces();

  const [newMessage, setNewMessage] = useState("");

  if (
    !params.id ||
    Array.isArray(params.id) ||
    !params.convId ||
    Array.isArray(params.convId)
  ) {
    return <p>Invalid conversation URL</p>;
  }

  const spaceId: string = params.id;
  const convId: string = params.convId;

  const space = spaces.find((s) => s.id === spaceId);
  const conversation = space?.conversations.find((c) => c.id === convId);

  if (!space || !conversation) {
    return <p>Conversation not found.</p>;
  }

  return (
    <div>
      <h1>{conversation.title}</h1>
      {/* Messages will go here */}

      {conversation.messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-2 rounded mb-2 max-w-xs ${
            msg.role === "user"
              ? "bg-blue-500 text-white ml-auto"
              : "bg-gray-200 text-black mr-auto"
          }`}
        >
          {msg.content}
        </div>
      ))}

      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
        className="border p-2 rounded w-full"
      />

      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => {
          if (!newMessage) return;
          addMessage(spaceId, convId, newMessage);
          setNewMessage("");
        }}
      >
        Send
      </button>
    </div>
  );
}
