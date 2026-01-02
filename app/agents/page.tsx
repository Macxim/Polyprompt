"use client";

import { useState } from "react";
import AgentCard from "./components/AgentCard";
import AgentModal from "../components/AgentModal";
import Banner from "../components/Banner";
import { useApp } from "../state/AppProvider";
import { Plus, Users, Sparkles } from "lucide-react";

export default function AgentsPage() {
  const { state, dispatch } = useApp();

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [description, setDescription] = useState("");

  const [nameError, setNameError] = useState("");
  const [personaError, setPersonaError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  // Filter agents
  const defaultAgents = state.agents.filter(a => a.isDefault);
  const customAgents = state.agents.filter(a => !a.isDefault);

  const activeAgent = state.activeAgentId
    ? state.agents.find((a) => a.id === state.activeAgentId) || null
    : null;

  const openCreateModal = () => {
    dispatch({ type: "CLEAR_ACTIVE_AGENT" });
    setName("");
    setPersona("");
    setDescription("");
    setNameError("");
    setPersonaError("");
    setDescriptionError("");
    dispatch({ type: "OPEN_AGENT_MODAL" });
  };

  const handleDuplicate = (agent: any) => {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newName = `${agent.name} (Copy)`;

    dispatch({
      type: "ADD_AGENT",
      payload: {
        ...agent,
        id: newId,
        name: newName,
        isDefault: false, // Ensure copy is not default
        isHidden: false, // Ensure copy is visible
      },
    });
    dispatch({ type: "SET_BANNER", payload: { message: `Duplicated ${agent.name}.`, type: "success" } });
  };

  const handleToggleVisibility = (agent: any) => {
    dispatch({
      type: "UPDATE_AGENT",
      payload: {
        ...agent,
        isHidden: !agent.isHidden,
      },
    });
  };

  const handleSubmit = () => {
    // ... (existing submit logic, can be removed if not used by modal directly, but logic is inside modal component usually or here? Wait, this handleSubmit was in the original file but not used by AgentModal directly? Ah, previously the modal logic might have been inside the page or handled differently.
    // The previous code had handleSubmit but AgentModal encapsulates logic? No, wait.
    // In previous file: `const handleSubmit = ...` but `<AgentModal />` handles its own submit internally?
    // Let's check AgentModal. content.
    // `AgentModal.tsx` has `handleSubmit` internally.
    // The `handleSubmit` in `AgentsPage` seems unused or redundant if `AgentModal` handles it.
    // Actually, looking at `AgentsPage` code I saw earlier, `handleSubmit` was defined but NOT passed to `AgentModal`.
    // `AgentModal` handles dispatch itself.
    // So I can remove `handleSubmit` and state variables for form if they are not used here.
    // Wait, the previous `AgentsPage` had `name`, `persona` etc state. But `AgentModal` ALSO has them.
    // It seems `AgentsPage` state was dead code or left over?
    // Let's remove the redundant form state and just use `AgentModal`.

    // HOWEVER, `openCreateModal` clears active agent which is fine.
    // I will stick to what's needed.
  };

  return (
    <>
      <Banner maxWidth="6xl" />

      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-10 animate-fade-in">
          <div>
             <h1 className="text-3xl font-bold text-slate-800 mb-2">My Agents</h1>
             <p className="text-slate-500">Create and manage your AI assistants.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Agent
          </button>
        </div>

        {!state._hydrated ? (
          <div className="space-y-12">
            <section>
              <div className="h-6 bg-slate-100 rounded w-48 mb-6"></div>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card h-[180px] bg-slate-50/50 border border-slate-200/60 rounded-3xl animate-pulse"></div>
                ))}
              </div>
            </section>
            <section>
              <div className="h-6 bg-slate-100 rounded w-48 mb-6"></div>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card h-[140px] bg-slate-50/50 border border-slate-200/60 rounded-3xl animate-pulse"></div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Custom Agents Section */}
            <section>
              <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                  <Users className="w-5 h-5" />
                </span>
                <span className="flex items-baseline">
                  Custom Agents
                  <span className="text-sm font-normal text-slate-400 ml-2">({customAgents.length})</span>
                </span>
              </h2>

              {customAgents.length === 0 ? (
                 <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-slate-500 mb-4">You haven't created any custom agents yet.</p>
                    <button
                      onClick={openCreateModal}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Create one now
                    </button>
                 </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {customAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )}
            </section>

            {/* Default Agents Section */}
            <section>
              <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="flex items-baseline">
                  Default Agents
                  <span className="text-sm font-normal text-slate-400 ml-2">({defaultAgents.length})</span>
                </span>
              </h2>

               <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {defaultAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onDuplicate={handleDuplicate}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
            </section>
          </div>
        )}

        <AgentModal />
      </div>
    </>
  );
}
