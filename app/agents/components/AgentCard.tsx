"use client";

import { Agent } from "../../types";
import { useApp } from "../../state/AppProvider";

type Props = {
  agent: Agent;
};

export default function AgentCard({ agent }: Props) {
  const { dispatch } = useApp();

  const handleEdit = () => {
    dispatch({ type: "SET_ACTIVE_AGENT", payload: { id: agent.id } });
    dispatch({ type: "OPEN_AGENT_MODAL" });
  };

  const handleDelete = () => {
    if (confirm(`Delete agent "${agent.name}"?`)) {
      dispatch({ type: "DELETE_AGENT", payload: { id: agent.id } });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent deleted." } });
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl relative group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
       {/* Decorative Gradient Background */}
       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

       <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200">
               {agent.name[0]?.toUpperCase() || "A"}
             </div>
             <div>
                <h2 className="font-bold text-lg text-slate-800 leading-tight">{agent.name}</h2>
                {agent.persona && (
                  <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 border border-indigo-100">
                    {agent.persona}
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
        </div>
      </div>
    </div>
  );
}
