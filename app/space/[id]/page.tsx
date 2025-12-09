"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { useState } from "react";

export default function SpacePage() {
  const { state, dispatch } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [newName, setNewName] = useState("");

  const spaces = state.spaces;

  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const space = spaces.find((s) => s.id === spaceId);
  const spaceAgents = space
    ? state.agents.filter((a) => (space.agentIds || []).includes(a.id))
    : [];

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
    if (!space || !space.agentIds || space.agentIds.length === 0) {
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

  /*
   * NEW LOGIC: "Add Agent" now just saves a new agent globally and links it.
   * We will keep this function for "Create new" via the UI,
   * BUT we also need a function to link an *existing* agent.
   */
  const handleCreateAndAddAgent = () => {
    const newAgentId = crypto.randomUUID();
    const newAgent = {
      id: newAgentId,
      name: "New Agent",
      persona: "",
      description: "",
    };

    dispatch({ type: "ADD_AGENT", payload: newAgent });
    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: { agentIds: [...(space.agentIds || []), newAgentId] },
    });
    setIsAddingAgent(false);
  };

  const handleLinkExistingAgent = () => {
    if (!selectedAgentId) return;

    // Check if already in space just in case
    if (space.agentIds?.includes(selectedAgentId)) {
      setIsAddingAgent(false);
      setSelectedAgentId("");
      return;
    }

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        agentIds: [...(space.agentIds || []), selectedAgentId],
      },
    });
    setIsAddingAgent(false);
    setSelectedAgentId("");
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
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;

    dispatch({
      type: "UPDATE_AGENT",
      payload: { ...agent, persona },
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
              Agents ({spaceAgents.length})
            </h2>
            <ul>
              {spaceAgents.map((agent) => (
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
          {isAddingAgent ? (
            <div className="flex items-center gap-2 border p-2 rounded bg-gray-50">
              <select
                className="border rounded px-2 py-1"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">-- Select Agent --</option>
                {state.agents
                  .filter((a) => !(space.agentIds || []).includes(a.id))
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
              </select>
              <button
                disabled={!selectedAgentId}
                onClick={handleLinkExistingAgent}
                className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                Add
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={handleCreateAndAddAgent}
                className="text-blue-600 text-sm underline"
              >
                Create New
              </button>
              <button
                onClick={() => setIsAddingAgent(false)}
                className="text-gray-500 text-sm ml-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => setIsAddingAgent(true)}
            >
              Add Agent
            </button>
          )}

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
