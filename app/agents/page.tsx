"use client";

import AgentCard from "./components/AgentCard";
import { Agent } from "../types";

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Alice",
    persona: "Researcher",
    description: "AI expert",
  },
  {
    id: "2",
    name: "Bob",
    persona: "Writer",
    description: "Creative writer",
  },
  {
    id: "3",
    name: "Charlie",
    persona: "Analyst",
    description: "Data enthusiast",
  },
];

export default function AgentsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Agents</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {mockAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
