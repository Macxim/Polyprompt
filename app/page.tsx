"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useApp } from "./state/AppProvider";

// Basic ID generator safe for all environments
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function Home() {
  const { dispatch, state } = useApp();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const MAX_LENGTH = 40;

  const handleAddSpace = () => {
    if (!name.trim()) {
      setNameError("Space name is required");
      nameInputRef.current?.focus();
      return;
    }

    if (name.length > MAX_LENGTH) {
      setNameError(`Name cannot exceed ${MAX_LENGTH} characters`);
      nameInputRef.current?.focus();
      return;
    }

    dispatch({
      type: "ADD_SPACE",
      payload: {
        id: generateId(),
        name,
        agentIds: [],
        conversations: [],
      },
    });

    dispatch({
      type: "SET_BANNER",
      payload: { message: "Space created successfully." },
    });

    setName("");
  };

  return (
    <>
      {state.ui.bannerMessage?.message && (
        <div
          role="status"
          className="mb-4 border border-green-500 bg-green-50 text-green-800 px-4 py-3 rounded flex justify-between items-start"
        >
          <span>{state.ui.bannerMessage.message}</span>
          <button
            onClick={() =>
              dispatch({ type: "SET_BANNER", payload: { message: null } })
            }
            className="ml-4 text-green-700 hover:text-green-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Polyprompt</h1>

        <div className="mb-6 px-6 py-3 border-l-4 border-blue-500 bg-gray-100/80">
          <h2 className="font-semibold text-lg mb-1">What is a Space?</h2>
          <p className="text-gray-800">
            A <strong>Space</strong> is a dedicated workspace where you can
            organize AI agents, conversations, and projects around a specific
            topic. Think of it as a “room” where all discussions and tools
            related to that topic live together.
          </p>
          <p className="text-gray-800 mt-2">
            <strong>Example:</strong> You might create a space called{" "}
            <em>Marketing Campaign</em>. Inside this space, you can have agents
            that help with copywriting or data analysis, and multiple
            conversations to brainstorm ideas or track tasks.
          </p>
        </div>

        {/* Add new space */}
        <div className="mb-6 flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              ref={nameInputRef}
              className={`border px-2 py-1 flex-1 rounded ${
                nameError ? "border-red-500" : ""
              }`}
              value={name}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length <= MAX_LENGTH) {
                  setName(value);
                  if (nameError) setNameError(""); // clear error as user types
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // prevent accidental form submission
                  handleAddSpace();
                }
              }}
              placeholder="New space name"
            />

            <button
              className="bg-blue-500 text-white px-4 py-1 rounded"
              onClick={handleAddSpace}
            >
              Add Space
            </button>
          </div>

          {/* Character counter */}
          <div className="text-right text-xs text-gray-500">
            {name.length}/{MAX_LENGTH}
          </div>

          {nameError && <p className="text-red-600 text-sm">{nameError}</p>}
        </div>

        {/* List spaces */}
        <div className="space-y-4">
          {state.spaces.map((space) => (
            <Link key={space.id} href={`/space/${space.id}`}>
              <div className="p-4 border rounded shadow hover:shadow-md transition cursor-pointer">
                <h2 className="font-bold text-lg">{space.name}</h2>
                <p className="text-sm text-gray-600">
                  Agents: {(space.agentIds || []).length}
                </p>
                <p className="text-sm text-gray-600">
                  Conversations: {space.conversations.length}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
