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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-bold text-xl text-slate-800">{agent.name}</h2>
          {agent.persona && (
            <span className="inline-block px-2 py-0.5 mt-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">
              {agent.persona}
            </span>
          )}
        </div>
        <div className="text-2xl">🤖</div>
      </div>

      {agent.description && (
        <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
          {agent.description}
        </p>
      )}

      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <button
          onClick={handleEdit}
          className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-2 bg-white border border-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-200 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
