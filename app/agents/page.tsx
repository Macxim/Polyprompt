"use client";

import { useState, useEffect, useTransition } from "react";
import AgentCard from "./components/AgentCard";
import { Agent } from "../types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [personaError, setPersonaError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const handleSubmit = () => {
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

    if (editingAgent) {
      // Edit existing agent
      const updatedAgent: Agent = {
        ...editingAgent,
        name,
        persona,
        description,
      };
      setAgents((prev) =>
        prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
      );
      setBannerMessage("Agent updated successfully.");
      setEditingAgent(null);
    } else {
      const newAgent: Agent = {
        id: crypto.randomUUID(),
        name,
        persona,
        description,
      };
      setAgents((prev) => [...prev, newAgent]);
      setBannerMessage("Agent created successfully.");
    }

    setName("");
    setPersona("");
    setDescription("");
    setIsModalOpen(false);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setPersona(agent.persona);
    setDescription(agent.description || "");
    setIsModalOpen(true);
  };

  const handleDelete = (agent: Agent) => {
    setAgentToDelete(agent);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("agents");
      if (stored) {
        startTransition(() => {
          setAgents(JSON.parse(stored));
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("agents", JSON.stringify(agents));
    } catch {}
  }, [agents]);

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {bannerMessage}
      </div>

      {bannerMessage && (
        <div
          role="status"
          className="mb-4 border border-green-500 bg-green-50 text-green-800 px-4 py-3 rounded flex justify-between items-start"
        >
          <span>{bannerMessage}</span>

          <button
            onClick={() => setBannerMessage(null)}
            className="ml-4 text-green-700 hover:text-green-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Agents</h1>

          <button
            onClick={() => {
              setEditingAgent(null);
              setName("");
              setPersona("");
              setDescription("");
              setIsModalOpen(true);
              setNameError("");
              setPersonaError("");
              setDescriptionError("");
            }}
          >
            + Create Agent
          </button>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">
                {editingAgent ? "Edit Agent" : "Create New Agent"}
              </h2>

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
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAgent(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {agentToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Delete Agent</h2>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete{" "}
                <strong>{agentToDelete.name}</strong>?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setAgentToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setAgents((prev) =>
                      prev.filter((a) => a.id !== agentToDelete.id)
                    );
                    setBannerMessage("Agent deleted successfully.");
                    setAgentToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
