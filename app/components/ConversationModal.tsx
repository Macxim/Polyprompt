"use client";

import { useEffect, useState } from "react";
import { useApp } from "../state/AppProvider";
import { useRouter } from "next/navigation";
import { CONVERSATION_TEMPLATES } from "../data/templates";
import { ConversationTemplate } from "../types";
import { DEFAULT_AGENTS } from "../data/defaultAgents";

type Props = {
  spaceId: string;
};

export default function ConversationModal({ spaceId }: Props) {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const [view, setView] = useState<"templates" | "custom">("templates");
  const [title, setTitle] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [autoMode, setAutoMode] = useState(false);

  const [titleError, setTitleError] = useState("");

  const space = state.spaces.find((s) => s.id === spaceId);

  // Reset state when modal opens
  useEffect(() => {
    if (state.ui.isConversationModalOpen) {
      setView("templates");
      setTitle("");
      setSelectedAgentIds([]);
      setAutoMode(false);
      setTitleError("");
    }
  }, [state.ui.isConversationModalOpen]);

  // Pre-select all available agents in space when switching to custom mode
  useEffect(() => {
    if (view === "custom" && space && space.agentIds) {
      // By default select all current space agents
      setSelectedAgentIds(space.agentIds);
    }
  }, [view, space]);


  const handleStartTemplate = (template: ConversationTemplate) => {
    if (!space) return;

    // 1. Determine agents to include
    // Template specifies selectedAgents (IDs).
    // We need to ensure these agents are in the space.
    const agentsToAdd = template.selectedAgents.filter(id => !space.agentIds?.includes(id));

    // Update space to include these agents if missing
    if (agentsToAdd.length > 0) {
      dispatch({
        type: "UPDATE_SPACE",
        id: space.id,
        changes: {
          agentIds: [...(space.agentIds || []), ...agentsToAdd],
        },
      });
    }

    // 2. Create Conversation
    const newConversationId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        conversations: [
          ...space.conversations,
          {
            id: newConversationId,
            title: template.name, // Use template name as title
            messages: [],
            participantIds: template.selectedAgents,
            updatedAt: Date.now(),
          },
        ],
      },
    });

    if (template.autoModeEnabled) {
      dispatch({ type: "SET_BANNER", payload: { message: `Started "${template.name}" template.`, type: "success" } });
    } else {
      dispatch({ type: "SET_BANNER", payload: { message: "Conversation created.", type: "success" } });
    }

    dispatch({ type: "CLOSE_CONVERSATION_MODAL" });

    // Construct URL with prompt if exists
    let url = `/space/${spaceId}/conversation/${newConversationId}`;
    const params = new URLSearchParams();
    if (template.autoModeEnabled) params.set('auto', 'true');
    if (template.startingPrompt) params.set('prompt', template.startingPrompt);

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    router.push(url);
  };


  const handleStartCustom = () => {
    if (!space) return;

    if (!title.trim()) {
      setTitleError("Conversation name is required");
      return;
    }

    if (selectedAgentIds.length === 0) {
      dispatch({ type: "SET_BANNER", payload: { message: "Please select at least one agent.", type: "error" } });
      return;
    }

    // Add any selected agents (e.g. defaults) to space if not present
    const agentsToAdd = selectedAgentIds.filter(id => !space.agentIds?.includes(id));
    if (agentsToAdd.length > 0) {
       dispatch({
        type: "UPDATE_SPACE",
        id: space.id,
        changes: {
          agentIds: [...(space.agentIds || []), ...agentsToAdd],
        },
      });
    }

    const newConversationId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        conversations: [
          ...space.conversations,
          {
            id: newConversationId,
            title: title.trim(),
            messages: [],
            participantIds: selectedAgentIds,
            updatedAt: Date.now(),
          },
        ],
      },
    });

    dispatch({ type: "SET_BANNER", payload: { message: "Conversation created.", type: "success" } });
    dispatch({ type: "CLOSE_CONVERSATION_MODAL" });
    router.push(`/space/${spaceId}/conversation/${newConversationId}${autoMode ? "?auto=true" : ""}`);
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  if (!state.ui.isConversationModalOpen) return null;

  // Combine Space Agents + Default Agents (unique)
  // We want to show:
  // 1. Agents currently in space
  // 2. Default agents (even if not in space) so user can add them easily
  // 3. Custom agents from library? Maybe later. For now focus on Defaults + Space.

  // Actually, "Agent Selection (if starting blank)" UI in request shows:
  // Default Agents: [List]
  // My Custom Agents: [List]

  const allDefaults = DEFAULT_AGENTS;
  const allCustom = state.agents.filter(a => !a.isDefault);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
            {view === "templates" ? "Start a New Conversation" : "New Custom Conversation"}
          </h2>
           {view === "custom" && (
             <button
               onClick={() => setView("templates")}
               className="text-sm text-slate-500 hover:text-indigo-600 font-medium"
             >
               Back to Templates
             </button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {view === "templates" ? (
            <div className="space-y-8">
              {/* Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CONVERSATION_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleStartTemplate(template)}
                    className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md transition-all text-left bg-white group"
                  >
                    <div className="flex items-center gap-2 mb-2 w-full">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{template.icon}</span>
                      <span className="font-bold text-slate-800 flex-1">{template.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                    <div className="mt-3 flex -space-x-2 overflow-hidden py-1">
                      {template.selectedAgents.map(agentId => {
                         const agent = state.agents.find(a => a.id === agentId);
                         if (!agent) return null;
                         return (
                           <div key={agentId} className="h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs" title={agent.name}>
                             {agent.avatar && agent.avatar.length <= 2 ? agent.avatar : (agent.name[0] || "?")}
                           </div>
                         )
                      })}
                    </div>
                  </button>
                ))}
              </div>

               {/* Custom/Blank Option */}
               <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Or start from scratch</h3>
                  <button
                    onClick={() => setView("custom")}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 font-medium transition-all flex items-center justify-center gap-2"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Create Blank Conversation
                  </button>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Conversation Name
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., Project Brainstorm"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError("");
                  }}
                  autoFocus
                />
                {titleError && (
                  <p className="text-red-600 text-sm mt-1">{titleError}</p>
                )}
              </div>

              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Select Agents
                </label>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {/* Default Agents */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Default Agents</h4>
                    <div className="space-y-2">
                      {allDefaults.map(agent => (
                        <label key={agent.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedAgentIds.includes(agent.id) ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}>
                           <div className="relative flex items-center justify-center">
                             <input
                              type="checkbox"
                              checked={selectedAgentIds.includes(agent.id)}
                              onChange={() => toggleAgentSelection(agent.id)}
                              className="peer sr-only"
                             />
                             <div className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${selectedAgentIds.includes(agent.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-white transition-transform ${selectedAgentIds.includes(agent.id) ? 'scale-100' : 'scale-0'}`}>
                                 <path fillRule="evenodd" d="M16.704 4.103a.75.75 0 0 1 .023 1.06l-8.47 8.47a.75.75 0 0 1-1.06 0l-4.242-4.242a.75.75 0 0 1 1.06-1.06l3.712 3.712 7.94-7.94a.75.75 0 0 1 1.06-.023Z" clipRule="evenodd" />
                               </svg>
                             </div>
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <span className={`text-sm font-bold transition-colors ${selectedAgentIds.includes(agent.id) ? 'text-indigo-900' : 'text-slate-700'}`}>
                                 {agent.name}
                               </span>
                               <span className="text-[10px] font-bold bg-white text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded shadow-sm opacity-80 uppercase tracking-tighter">
                                 {agent.model}
                               </span>
                             </div>
                             <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{agent.persona}</p>
                           </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom Agents */}
                  {allCustom.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 mt-4">My Custom Agents</h4>
                       <div className="space-y-2">
                         {allCustom.map(agent => (
                          <label key={agent.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedAgentIds.includes(agent.id) ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}>
                             <div className="relative flex items-center justify-center">
                               <input
                                  type="checkbox"
                                  checked={selectedAgentIds.includes(agent.id)}
                                  onChange={() => toggleAgentSelection(agent.id)}
                                  className="peer sr-only"
                                />
                                <div className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${selectedAgentIds.includes(agent.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-white transition-transform ${selectedAgentIds.includes(agent.id) ? 'scale-100' : 'scale-0'}`}>
                                    <path fillRule="evenodd" d="M16.704 4.103a.75.75 0 0 1 .023 1.06l-8.47 8.47a.75.75 0 0 1-1.06 0l-4.242-4.242a.75.75 0 0 1 1.06-1.06l3.712 3.712 7.94-7.94a.75.75 0 0 1 1.06-.023Z" clipRule="evenodd" />
                                  </svg>
                                </div>
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold transition-colors ${selectedAgentIds.includes(agent.id) ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    {agent.name}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{agent.persona}</p>
                              </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Mode Toggle */}
               <label htmlFor="autoMode" className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer border transition-all ${autoMode ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                 <div className="relative">
                   <input
                      type="checkbox"
                      id="autoMode"
                      checked={autoMode}
                      onChange={(e) => setAutoMode(e.target.checked)}
                      className="peer sr-only"
                   />
                   <div className={`w-12 h-6 rounded-full transition-colors relative ${autoMode ? 'bg-indigo-500/50' : 'bg-slate-300'}`}>
                     <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${autoMode ? 'translate-x-6' : 'translate-x-0'} shadow-sm`}></div>
                   </div>
                 </div>
                 <div className="flex-1">
                    <div className={`font-bold text-sm ${autoMode ? 'text-white' : 'text-slate-800'}`}>Enable Auto-Mode</div>
                    <div className={`text-xs ${autoMode ? 'text-indigo-100' : 'text-slate-500'}`}>Agents will discuss automatically after your first message</div>
                 </div>
                 {autoMode && (
                   <div className="text-xl animate-bounce">✨</div>
                 )}
               </label>

            </div>
          )}
        </div>

        {/* Footer actions for Custom View */}
        {view === "custom" && (
           <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => dispatch({ type: "CLOSE_CONVERSATION_MODAL" })}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartCustom}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedAgentIds.length === 0 || !title.trim()}
              >
                Start Conversation
              </button>
           </div>
        )}
        {view === "templates" && (
           <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
             <button
                onClick={() => dispatch({ type: "CLOSE_CONVERSATION_MODAL" })}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors"
              >
                Cancel
              </button>
           </div>
        )}

      </div>
    </div>
  );
}
