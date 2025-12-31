"use client";

import { Agent } from "../../types";
import { useApp } from "../../state/AppProvider";
import { Eye, EyeOff, Trash2 } from "lucide-react";

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
    <div className={`glass-card p-6 rounded-3xl border border-slate-200/60 relative group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${agent.isHidden ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100" : ""}`}>
       {/* Decorative Gradient Background */}
       <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 ${agent.isDefault ? "bg-amber-50/50" : "bg-indigo-50/50"}`}></div>

       {agent.isDefault && !agent.isHidden && (
         <div className="absolute top-4 right-4 z-20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
              Default
            </span>
         </div>
       )}

       {agent.isHidden && (
         <div className="absolute top-4 right-4 z-20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
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
                   <Eye className="w-5 h-5 text-indigo-600" />
                ) : (
                  <EyeOff className="w-5 h-5" />
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
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
