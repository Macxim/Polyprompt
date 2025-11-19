"use client";

import Link from "next/link";
import { useSpaces } from "./context/SpaceContext";
import { useState } from "react";

export default function Home() {
  const { spaces, addSpace } = useSpaces();
  const [name, setName] = useState("");

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Polyprompt</h1>

      <div className="mb-6 px-6 py-3 border-l-4 border-blue-500 bg-gray-100/80">
        <h2 className="font-semibold text-lg mb-1">What is a Space?</h2>
        <p className="text-gray-800">
          A <strong>Space</strong> is a dedicated workspace where you can
          organize AI agents, conversations, and projects around a specific
          topic. Think of it as a “room” where all discussions and tools related
          to that topic live together.
        </p>
        <p className="text-gray-800 mt-2">
          <strong>Example:</strong> You might create a space called{" "}
          <em>Marketing Campaign</em>. Inside this space, you can have agents
          that help with copywriting or data analysis, and multiple
          conversations to brainstorm ideas or track tasks.
        </p>
      </div>

      {/* Add new space */}
      <div className="mb-6 flex gap-2">
        <input
          className="border px-2 py-1 flex-1 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New space name"
        />
        <button
          className="bg-blue-500 text-white px-4 py-1 rounded"
          onClick={() => {
            if (name.trim() !== "") {
              addSpace(name);
              setName("");
            }
          }}
        >
          Add Space
        </button>
      </div>

      {/* List spaces */}
      <div className="space-y-4">
        {spaces.map((space) => (
          <Link key={space.id} href={`/space/${space.id}`}>
            <div className="p-4 border rounded shadow hover:shadow-md transition cursor-pointer">
              <h2 className="font-bold text-lg">{space.name}</h2>
              <p className="text-sm text-gray-600">
                Agents: {space.agents.length}
              </p>
              <p className="text-sm text-gray-600">
                Conversations: {space.conversations.length}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
