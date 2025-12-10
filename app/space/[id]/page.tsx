"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { useState } from "react";
import AgentModal from "@/app/components/AgentModal";

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
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
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
  /*
   * Updated Logic: Open the global Agent Modal.
   * We pass a callback to the modal (handled via component prop) or handle it in the modal itself?
   * Since the modal is global, we can't easily pass a callback unless we structure it differently.
   * However, I added `onAgentCreated` prop to `AgentModal`.
   * So we will render `AgentModal` in this page and pass the callback.
   */
  const handleCreateAndAddAgent = () => {
    dispatch({ type: "CLEAR_ACTIVE_AGENT" });
    dispatch({ type: "OPEN_AGENT_MODAL" });
    // The actual agent creation happens in the modal.
    // We'll listen for the new agent ID via the callback passed to <AgentModal />
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

  const removeAgentFromSpace = (agentId: string) => {
    if (!space.agentIds) return;

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        agentIds: space.agentIds.filter((id) => id !== agentId),
      },
    });
  };

  /* ------------------------------------------------------ */

  return (
    <>
      {state.ui.bannerMessage?.message && (
        <div
          role="status"
          className="mb-4 border border-green-200 bg-green-50 text-green-800 px-4 py-3 rounded-lg flex justify-between items-start shadow-sm mx-4 mt-4 max-w-6xl lg:mx-auto"
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

      <div className="p-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-10">
          <button
            onClick={() => router.push("/")}
            className="text-slate-500 hover:text-blue-600 text-sm font-medium mb-4 flex items-center gap-1 transition-colors"
          >
            ← Back to Spaces
          </button>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
               {isEditing ? (
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => handleRename()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                  }}
                  autoFocus
                  className="text-4xl font-extrabold text-slate-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                />
              ) : (
                <div className="group flex items-center gap-3">
                  <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                    {space.name}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition-all"
                    title="Rename Space"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-slate-500 mt-2 text-sm">ID: {space.id}</p>
            </div>

            <button
              onClick={deleteSpace}
              className="text-red-400 hover:text-red-600 text-sm font-medium hover:underline transition-colors"
            >
              Delete Space
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT SIDEBAR: AGENTS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-xl text-slate-800">Team ({spaceAgents.length})</h2>
              </div>

              <ul className="space-y-4 mb-6">
                {spaceAgents.map((agent) => (
                  <li key={agent.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-semibold text-slate-800">{agent.name}</span>
                       <button
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => removeAgentFromSpace(agent.id)}
                        title="Remove from space"
                      >
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                      </button>
                    </div>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                      placeholder="Override Role/Persona..."
                      value={agent.persona}
                      onChange={(e) => updateAgentPersona(agent.id, e.target.value)}
                    />
                  </li>
                ))}
                {spaceAgents.length === 0 && (
                  <li className="text-slate-400 text-sm italic text-center py-4">No agents in this space yet.</li>
                )}
              </ul>

              {isAddingAgent ? (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Add Existing Agent</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                    <option value="">Select an agent...</option>
                    {state.agents
                      .filter((a) => !(space.agentIds || []).includes(a.id))
                      .map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      disabled={!selectedAgentId}
                      onClick={handleLinkExistingAgent}
                      className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setIsAddingAgent(false)}
                      className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 text-center">
                    <button
                      onClick={handleCreateAndAddAgent}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                    >
                      + Create New Agent
                    </button>
                  </div>
                </div>
              ) : (
                 <button
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  onClick={() => setIsAddingAgent(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  Add Agent
                </button>
              )}
            </div>
          </div>

          {/* RIGHT MAIN: CONVERSATIONS */}
          <div className="lg:col-span-2">
             <div className="flex justify-between items-center mb-6">
               <h2 className="font-bold text-2xl text-slate-800">Conversations</h2>
               <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                onClick={addConversation}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3L10.58 12.42a4 4 0 0 1-1.343.885L6.1 14.68a.3.3 0 0 1-.366-.366l.8-2.617a.4.4 0 0 1 .108-.198.398.398 0 0 1 .195-.106l-1.404 2.524z" />
                   {/* Simplified chat icon */}
                   <path fillRule="evenodd" d="M10 2c-4.418 0-8 3.134-8 7s3.582 7 8 7c.484 0 .956-.038 1.413-.111l2.978 1.654a1 1 0 0 0 1.442-1.085l-.364-2.181C16.892 12.793 18 10.982 18 9c0-3.866-3.582-7-8-7z" clipRule="evenodd" />
                </svg>
                New Chat
              </button>
             </div>

             <div className="grid gap-4 sm:grid-cols-2">
               {space.conversations.length === 0 ? (
                 <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                   <p className="text-slate-400 font-medium">No conversations yet.</p>
                   <p className="text-sm text-slate-400 mt-1">Start a new chat to brainstorm with your agents.</p>
                 </div>
               ) : (
                 space.conversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/space/${space.id}/conversation/${conv.id}`}
                    >
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer h-full flex flex-col justify-between group">
                         <div>
                           <div className="flex items-start justify-between mb-2">
                             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                </svg>
                             </div>
                             <span className="text-xs text-slate-400 font-mono">{conv.messages.length} msgs</span>
                           </div>
                           <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition-colors mb-2 line-clamp-1">{conv.title}</h3>
                           <p className="text-sm text-slate-500 line-clamp-2">
                             {conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content : "No messages yet."}
                           </p>
                         </div>
                         <div className="mt-4 flex items-center text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                           Open chat →
                         </div>
                      </div>
                    </Link>
                 ))
               )}
             </div>
          </div>
        </div>

        <AgentModal
          onAgentCreated={(newAgentId) => {
            // Automatically link the new agent to this space
            dispatch({
              type: "UPDATE_SPACE",
              id: space.id,
              changes: {
                agentIds: [...(space.agentIds || []), newAgentId],
              },
            });
            setIsAddingAgent(false);
          }}
        />
      </div>
    </>
  );
}
