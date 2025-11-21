"use client";

import { Agent } from "../../types";

type AgentCardProps = {
  agent: Agent;
};

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="p-4 border rounded">
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
  );
}
