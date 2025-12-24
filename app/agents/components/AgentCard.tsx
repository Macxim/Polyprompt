"use client";

import { Agent } from "../../types";
import { useApp } from "../../state/AppProvider";

type Props = {
  agent: Agent;
  onDuplicate?: (agent: Agent) => void;
  onToggleVisibility?: (agent: Agent) => void;
};

export default function AgentCard({ agent, onDuplicate, onToggleVisibility }: Props) {
  const { dispatch } = useApp();

  const handleEdit = () => {
    dispatch({ type: "SET_ACTIVE_AGENT", payload: { id: agent.id } });
    dispatch({ type: "OPEN_AGENT_MODAL" });
  };

  const handleDelete = () => {
    if (confirm(`Delete agent "${agent.name}"?`)) {
      dispatch({ type: "DELETE_AGENT", payload: { id: agent.id } });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent deleted.", type: "success" } });
    }
  };

  return (
    <div className={`glass-card p-6 rounded-2xl relative group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${agent.isHidden ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100" : ""}`}>
       {/* Decorative Gradient Background */}
       <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 ${agent.isDefault ? "bg-amber-50/50" : "bg-indigo-50/50"}`}></div>

       {agent.isDefault && !agent.isHidden && (
         <div className="absolute top-4 right-4 z-20">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
              Default
            </span>
         </div>
       )}

       {agent.isHidden && (
         <div className="absolute top-4 right-4 z-20">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
              Hidden
            </span>
         </div>
       )}

       <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-lg ${agent.isDefault ? "bg-gradient-to-br from-amber-200 to-amber-300 shadow-orange-100" : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-200"}`}>
               {agent.avatar && agent.avatar.length <= 2 ? agent.avatar : (agent.name[0]?.toUpperCase() || "A")}
             </div>
             <div>
                <h2 className="font-bold text-lg text-slate-800 leading-tight">{agent.name}</h2>
                {agent.persona && (
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 border ${agent.isDefault ? "text-amber-700 bg-amber-50 border-amber-100" : "text-indigo-600 bg-indigo-50 border-indigo-100"}`}>
                    {agent.persona.split(',')[0] || agent.persona}
                  </span>
                )}
             </div>
          </div>
        </div>

        {agent.description ? (
          <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
            {agent.description}
          </p>
        ) : (
          <p className="text-slate-400 text-sm italic mb-6">No description provided.</p>
        )}

        <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100/50">
          {agent.isDefault ? (
            <>
               <button
                onClick={() => onDuplicate && onDuplicate(agent)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-colors shadow-sm"
                title="Duplicate to customize"
              >
                Duplicate
              </button>
               <button
                onClick={() => onToggleVisibility && onToggleVisibility(agent)}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-slate-600 transition-colors shadow-sm"
                title={agent.isHidden ? "Show Agent" : "Hide Agent"}
              >
                {agent.isHidden ? (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.373 1.651 1.651 0 0 0 0-1.186A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69L9.999 8.938 12.18 11.118a1.5 1.5 0 0 1-2.182-2.181 4.417 4.417 0 0 0-2.247-2.247Zm-2.215 2.215L12.115 15.483a9.98 9.98 0 0 1-2.116.517c-4.24 0-7.868-2.637-9.317-6.38a1.65 1.65 0 0 1 .012-1.168 10.016 10.016 0 0 1 1.353-2.032l.704.704a2.983 2.983 0 0 0-.214.288Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-colors shadow-sm"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-400 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
              >
                <span className="sr-only">Delete</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
