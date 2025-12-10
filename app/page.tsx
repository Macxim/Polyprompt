"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useApp } from "./state/AppProvider";
import Banner from "./components/Banner";

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
      <Banner maxWidth="4xl" />

      <div className="p-8 max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight pb-2">
            Polyprompt
          </h1>
          <p className="text-slate-500 text-lg">Orchestrate your AI workforce.</p>
        </header>

        <div className="mb-10 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-xl mb-2 text-slate-800">What is a Space?</h2>
          <p className="text-slate-600 leading-relaxed">
            A <strong>Space</strong> is a dedicated workspace where you can
            organize AI agents, conversations, and projects around a specific
            topic. Think of it as a “room” where all discussions and tools
            related to that topic live together.
          </p>
          <p className="text-slate-600 mt-2 leading-relaxed">
            <strong>Example:</strong> You might create a space called{" "}
            <em>Marketing Campaign</em>. Inside this space, you can have agents
            that help with copywriting or data analysis, and multiple
            conversations to brainstorm ideas or track tasks.
          </p>
        </div>

        {/* Add new space */}
        <div className="mb-10">
          <div className="flex gap-3">
            <input
              ref={nameInputRef}
              className={`flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition shadow-sm ${
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
              placeholder="Name your new space..."
            />

            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg shadow-md transition-all active:scale-95"
              onClick={handleAddSpace}
            >
              Create Space
            </button>
          </div>

          {/* Character counter */}
          <div className="flex justify-between mt-2 px-1">
             {nameError ? <p className="text-red-500 text-sm font-medium">{nameError}</p> : <div></div>}
             <div className="text-xs text-slate-400">
              {name.length}/{MAX_LENGTH}
            </div>
          </div>
        </div>

        {/* List spaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.spaces.map((space) => (
            <Link key={space.id} href={`/space/${space.id}`}>
              <div className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="font-bold text-xl text-slate-800 mb-2">{space.name}</h2>
                <div className="flex gap-4 text-sm text-slate-500">
                  <span>🤖 {(space.agentIds || []).length} Agents</span>
                  <span>💬 {space.conversations.length} Chats</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
