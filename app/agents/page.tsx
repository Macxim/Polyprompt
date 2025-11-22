"use client";

import { useState } from "react";
import AgentCard from "./components/AgentCard";
import { Agent } from "../types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [personaError, setPersonaError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const handleCreate = () => {
    let valid = true;

    if (!name.trim()) {
      setNameError("Name is required");
      valid = false;
    } else {
      setNameError("");
    }

    if (!persona.trim()) {
      setPersonaError("Persona/Role is required");
      valid = false;
    } else {
      setPersonaError("");
    }

    if (description.length > 200) {
      setDescriptionError("Description cannot exceed 200 characters");
      valid = false;
    } else {
      setDescriptionError("");
    }

    if (!valid) return;

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      name,
      persona,
      description,
    };

    setAgents((prev) => [...prev, newAgent]);

    setName("");
    setPersona("");
    setDescription("");
    setIsModalOpen(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agents</h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Create Agent
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Create Agent</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                />
                {nameError && (
                  <p className="text-red-600 text-sm mt-1">{nameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Persona
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={persona}
                  onChange={(e) => {
                    setPersona(e.target.value);
                    if (personaError) setPersonaError("");
                  }}
                />
                {personaError && (
                  <p className="text-red-600 text-sm mt-1">{personaError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>

                <div className="relative">
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (descriptionError) setDescriptionError(""); // clear error as user types
                    }}
                    maxLength={200} // optional: enforce max length in input
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {description.length}/200
                  </div>
                </div>
                {descriptionError && (
                  <p className="text-red-600 text-sm mt-1">
                    {descriptionError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
