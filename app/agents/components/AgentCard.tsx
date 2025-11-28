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
    <div className="p-4 border rounded shadow-sm">
      <h2 className="font-semibold text-xl">{agent.name}</h2>
      {agent.persona && (
        <p className="text-gray-600 mt-1">Role: {agent.persona}</p>
      )}
      {agent.description && (
        <p className="text-gray-600 mt-1">{agent.description}</p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleEdit}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
