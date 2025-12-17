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

    // Construct initial messages if starting prompt exists?
    // Actually user wants "Prompt: ..." which might mean the starting USER message.
    const initialMessages = template.startingPrompt ? [{
      id: "init-prompt-" + Date.now(),
      role: "user" as const,
      content: template.startingPrompt,
      timestamp: Date.now(),
    }] : [];

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        conversations: [
          ...space.conversations,
          {
            id: newConversationId,
            title: template.name, // Use template name as title
            messages: initialMessages,
            participantIds: template.selectedAgents,
          },
        ],
      },
    });

    if (template.autoModeEnabled) {
      // We can't easily trigger the "Auto Mode" loop from here directly because it's in the page component logic.
      // But we can enable it via query param or just rely on the user seeing the prompt.
      // For now we'll just create the conversation.
      // User request said "Auto-mode: ON".
      // Maybe we append `?auto=true` to the URL?
      dispatch({ type: "SET_BANNER", payload: { message: `Started "${template.name}" template.` } });
    } else {
      dispatch({ type: "SET_BANNER", payload: { message: "Conversation created." } });
    }

    dispatch({ type: "CLOSE_CONVERSATION_MODAL" });
    router.push(`/space/${spaceId}/conversation/${newConversationId}${template.autoModeEnabled ? "?auto=true" : ""}`);
  };

  const handleStartCustom = () => {
    if (!space) return;

    if (!title.trim()) {
      setTitleError("Conversation name is required");
      return;
    }

    if (selectedAgentIds.length === 0) {
      dispatch({ type: "SET_BANNER", payload: { message: "Please select at least one agent." } });
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
          },
        ],
      },
    });

    dispatch({ type: "SET_BANNER", payload: { message: "Conversation created." } });
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
                       {template.autoModeEnabled && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                    <div className="mt-3 flex -space-x-2 overflow-hidden py-1">
                      {template.selectedAgents.map(agentId => {
                         const agent = state.agents.find(a => a.id === agentId);
                         if (!agent) return null;
                         return (
                           <div key={agentId} className="h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px]" title={agent.name}>
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
                        <label key={agent.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                           <input
                            type="checkbox"
                            checked={selectedAgentIds.includes(agent.id)}
                            onChange={() => toggleAgentSelection(agent.id)}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                          />
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <span className="text-sm font-medium text-slate-800">{agent.name}</span>
                               <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{agent.model}</span>
                             </div>
                             <p className="text-xs text-slate-400 line-clamp-1">{agent.persona}</p>
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
                          <label key={agent.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedAgentIds.includes(agent.id)}
                              onChange={() => toggleAgentSelection(agent.id)}
                              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <div className="flex-1">
                               <div className="flex items-center gap-2">
                                 <span className="text-sm font-medium text-slate-800">{agent.name}</span>
                               </div>
                               <p className="text-xs text-slate-400 line-clamp-1">{agent.persona}</p>
                             </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Mode Toggle */}
              <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <input
                   type="checkbox"
                   id="autoMode"
                   checked={autoMode}
                   onChange={(e) => setAutoMode(e.target.checked)}
                   className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-indigo-300"
                />
                <label htmlFor="autoMode" className="cursor-pointer select-none">
                   <div className="font-bold text-indigo-900 text-sm">Enable Auto-Mode</div>
                   <div className="text-xs text-indigo-600">Agents will discuss automatically after your first message</div>
                </label>
              </div>

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
