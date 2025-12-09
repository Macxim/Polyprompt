"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { useState } from "react";

export default function SpacePage() {
  const { state, dispatch } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");

  const spaces = state.spaces;

  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const space = spaces.find((s) => s.id === spaceId);

  if (!space && !deleting) {
    return (
      <div className="p-8">
        <p className="text-red-500">Space not found.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-3 underline text-blue-600"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!space) return null;

  /* ---------------------- ACTIONS ---------------------- */

  const handleRename = () => {
    if (newName.trim() && newName !== space.name) {
      dispatch({
        type: "UPDATE_SPACE",
        id: space.id,
        changes: { name: newName.trim() },
      });
    }
    setIsEditing(false);
  };

  const addConversation = () => {
    if (!space || !space.agents || space.agents.length === 0) {
      dispatch({
        type: "SET_BANNER",
        payload: { message: "Add an agent before starting a conversation." },
      });
      return;
    }

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        conversations: [
          ...space.conversations,
          {
            id: crypto.randomUUID(),
            title: "New Conversation",
            messages: [],
          },
        ],
      },
    });
  };

  const addAgent = () => {
    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        agents: [
          ...space.agents,
          {
            id: crypto.randomUUID(),
            name: "New Agent",
            persona: "",
            description: "",
          },
        ],
      },
    });
  };

  const deleteSpace = () => {
    setDeleting(true);
    dispatch({ type: "DELETE_SPACE", payload: { id: space.id } });
    dispatch({
      type: "SET_BANNER",
      payload: { message: "Space deleted successfully." },
    });

    router.replace("/");
  };

  const updateAgentPersona = (agentId: string, persona: string) => {
    const updatedAgents = space.agents.map((agent) =>
      agent.id === agentId ? { ...agent, persona } : agent
    );

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: { agents: updatedAgents },
    });
  };

  /* ------------------------------------------------------ */

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
        {isEditing ? (
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => handleRename()}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            autoFocus
            className="border px-2 py-1 rounded"
          />
        ) : (
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">{space.name}</h1>
            <button className="text-sm" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          </div>
        )}

        <p className="text-gray-600 mb-6">ID: {space.id}</p>

        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold text-xl">
              Agents ({space.agents.length})
            </h2>
            <ul>
              {space.agents.map((agent) => (
                <li key={agent.id} className="py-1">
                  {agent.name}
                  <input
                    className="ml-2 border px-2 py-1"
                    value={agent.persona}
                    onChange={(e) =>
                      updateAgentPersona(agent.id, e.target.value)
                    }
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold text-xl">
              Conversations ({space.conversations.length})
            </h2>
            <ul>
              {space.conversations.map((conv) => (
                <li key={conv.id} className="py-1">
                  <Link
                    href={`/space/${space.id}/conversation/${conv.id}`}
                    className="text-blue-600 underline"
                  >
                    {conv.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={addConversation}
          >
            Add Conversation
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={addAgent}
          >
            Add Agent
          </button>

          <button className="text-red-500 underline" onClick={deleteSpace}>
            Delete
          </button>
        </div>

        <button
          className="mt-6 underline text-blue-600"
          onClick={() => router.push("/")}
        >
          Back to spaces
        </button>
      </div>
    </>
  );
}
