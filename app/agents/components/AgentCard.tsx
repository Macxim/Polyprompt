"use client";

import { Agent } from "../../types";

type AgentCardProps = {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
};

export default function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  return (
    <div className="p-4 border rounded flex flex-col justify-between h-full">
      <div>
        <h2 className="font-semibold text-xl">{agent.name}</h2>
        {agent.description && (
          <p className="text-gray-600 mt-2">{agent.description}</p>
        )}
        {agent.persona && (
          <p className="text-gray-600 mt-2">
            <strong>Role:</strong> {agent.persona}
          </p>
        )}
      </div>

      <button
        onClick={() => onEdit(agent)}
        className="mt-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(agent)}
        className="text-red-600 hover:underline text-sm"
      >
        Delete
      </button>
    </div>
  );
}
