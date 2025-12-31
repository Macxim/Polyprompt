"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { useState } from "react";
import AgentModal from "@/app/components/AgentModal";
import Banner from "@/app/components/Banner";
import ConversationModal from "@/app/components/ConversationModal";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import { ArrowLeft, Pencil, Users, UserMinus, Plus, MessageSquare, Trash2, ChevronDown } from "lucide-react";

export default function SpacePage() {
  const { state, dispatch } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    if (isSaving) return;
    if (newName.trim() && newName !== space.name) {
      setIsSaving(true);
      dispatch({
        type: "UPDATE_SPACE",
        id: space.id,
        changes: { name: newName.trim() },
      });
      setTimeout(() => setIsSaving(false), 100);
    }
    setIsEditing(false);
  };

  const addConversation = () => {
    if (!space || !space.agentIds || space.agentIds.length === 0) {
      dispatch({
        type: "SET_BANNER",
        payload: { message: "Add an agent before starting a conversation.", type: "error" },
      });
      return;
    }

    // Open the modal to let user name the conversation
    dispatch({ type: "OPEN_CONVERSATION_MODAL" });
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
      payload: { message: "Space deleted successfully.", type: "success" },
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
      <Banner maxWidth="6xl" />

      <div className="p-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-10">
          <button
            onClick={() => router.push("/")}
            className="text-slate-500 hover:text-indigo-600 text-sm font-medium mb-6 flex items-center gap-2 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Spaces
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
                    onClick={() => {
                      setNewName(space.name);
                      setIsEditing(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-500 transition-all"
                    title="Rename Space"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-slate-500 mt-2 text-sm">ID: {space.id}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT SIDEBAR: AGENTS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-3xl border border-slate-200/60 shadow-sm bg-white/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-xl text-slate-800">Team ({spaceAgents.length})</h2>
              </div>

              <ul className="space-y-4 mb-6">
                {spaceAgents.map((agent) => (
                  <li key={agent.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <AvatarDisplay agent={agent} size="sm" />
                        <span className="font-semibold text-slate-800">{agent.name}</span>
                      </div>
                       <button
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => removeAgentFromSpace(agent.id)}
                        title="Remove from space"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                    {!agent.isDefault && (
                      <input
                        className="mt-2 w-full bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                        placeholder="Override Role/Persona..."
                        value={agent.persona}
                        onChange={(e) => updateAgentPersona(agent.id, e.target.value)}
                      />
                    )}
                  </li>
                ))}
                {spaceAgents.length === 0 && (
                  <li className="text-slate-400 text-sm italic text-center py-4">No agents in this space yet.</li>
                )}
              </ul>

              {isAddingAgent ? (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Add Existing Agent</label>
                  <div className="relative mb-3">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full text-left bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none flex items-center justify-between"
                    >
                      {selectedAgentId ? (
                        <span className="text-slate-800">
                          {state.agents.find(a => a.id === selectedAgentId)?.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Select an agent...</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {state.agents
                          .filter((a) => !(space.agentIds || []).includes(a.id))
                          .length === 0 ? (
                           <div className="p-3 text-sm text-slate-500 text-center italic">No available agents to add.</div>
                        ) : (
                          state.agents
                            .filter((a) => !(space.agentIds || []).includes(a.id))
                            .map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => {
                                  setSelectedAgentId(agent.id);
                                  setIsDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex flex-col items-start border-b border-slate-50 last:border-0"
                              >
                                <span className="font-medium text-slate-800">{agent.name}</span>
                                {agent.persona && (
                                  <span className="text-xs text-slate-500">{agent.persona}</span>
                                )}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>

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
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  onClick={() => setIsAddingAgent(true)}
                >
                  <Plus className="w-5 h-5" />
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
                <Plus className="w-5 h-5" />
                New Chat
              </button>
             </div>

             <div className="grid gap-4 sm:grid-cols-2">
               {space.conversations.length === 0 ? (
                 <div className="col-span-full py-12 text-center bg-slate-50/30 border-2 border-dashed border-slate-200/60 rounded-3xl">
                   <p className="text-slate-400 font-medium">No conversations yet.</p>
                   <p className="text-sm text-slate-400 mt-1">Start a new chat to brainstorm with your agents.</p>
                 </div>
                ) : (
                  space.conversations.map((conv) => (
                    <div key={conv.id} className="relative">
                      <Link
                        href={`/space/${space.id}/conversation/${conv.id}`}
                      >
                        <div className="glass-card bg-white/50 p-5 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer h-full flex flex-col justify-between group">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                <MessageSquare className="w-5 h-5" />
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
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Delete conversation "${conv.title}"?`)) {
                            dispatch({
                              type: "DELETE_CONVERSATION",
                              payload: { spaceId: space.id, conversationId: conv.id },
                            });
                             dispatch({
                               type: "SET_BANNER",
                               payload: { message: "Conversation deleted.", type: "success" },
                             });
                          }
                        }}
                        className="absolute top-3 right-3 p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 z-10"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

        <ConversationModal spaceId={spaceId} />

        {/* Danger Zone - Collapsible */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <button
            onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-slate-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-700">Advanced Options</h3>
                <p className="text-xs text-slate-500">Manage space deletion</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isDangerZoneOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDangerZoneOpen && (
            <div className="mt-4 p-6 rounded-2xl border border-red-200/60 bg-red-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 mb-1">Delete this space</h4>
                  <p className="text-sm text-red-700/80 leading-relaxed mb-4">
                    This will permanently delete <strong>"{space.name}"</strong> and all its conversations. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-sm active:scale-95"
                  >
                    Delete Space
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Delete Space?</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    You're about to permanently delete <strong className="text-slate-900">"{space.name}"</strong>.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                      <span>{space.conversations.length} conversation{space.conversations.length !== 1 ? 's' : ''} will be deleted</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                      <span>All agent associations will be removed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                      <span>This cannot be recovered</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      deleteSpace();
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all active:scale-95"
                  >
                    Delete Space
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
