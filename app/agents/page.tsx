"use client";

import { useState } from "react";
import AgentCard from "./components/AgentCard";
import { useApp } from "../state/AppProvider";

export default function AgentsPage() {
  const { state, dispatch } = useApp();

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [description, setDescription] = useState("");

  const [nameError, setNameError] = useState("");
  const [personaError, setPersonaError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const activeAgent = state.activeAgentId
    ? state.agents.find((a) => a.id === state.activeAgentId) || null
    : null;

  const openCreateModal = () => {
    dispatch({ type: "CLEAR_ACTIVE_AGENT" });
    setName("");
    setPersona("");
    setDescription("");
    setNameError("");
    setPersonaError("");
    setDescriptionError("");
    dispatch({ type: "OPEN_AGENT_MODAL" });
  };

  const handleSubmit = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError("Name is required");
      valid = false;
    } else setNameError("");

    if (!persona.trim()) {
      setPersonaError("Persona/Role is required");
      valid = false;
    } else setPersonaError("");

    if (description.length > 200) {
      setDescriptionError("Description cannot exceed 200 characters");
      valid = false;
    } else setDescriptionError("");

    if (!valid) return;

    if (activeAgent) {
      dispatch({
        type: "UPDATE_AGENT",
        payload: { ...activeAgent, name, persona, description },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent updated." } });
    } else {
      dispatch({
        type: "ADD_AGENT",
        payload: { id: crypto.randomUUID(), name, persona, description },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent created." } });
    }

    dispatch({ type: "CLOSE_AGENT_MODAL" });
  };

  return (
    <div className="p-8">
      {/* Banner */}
      {state.ui.bannerMessage && (
        <div className="mb-4 border border-green-500 bg-green-50 text-green-800 px-4 py-3 rounded flex justify-between items-start">
          <span>{state.ui.bannerMessage}</span>
          <button
            onClick={() =>
              dispatch({ type: "SET_BANNER", payload: { message: null } })
            }
            className="ml-4 text-green-700 hover:text-green-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agents</h1>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Create Agent
        </button>
      </div>

      {/* Agent grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {state.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Modal */}
      {state.ui.isAgentModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              {activeAgent ? "Edit Agent" : "Create New Agent"}
            </h2>

            <div className="space-y-4">
              {/* Name */}
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

              {/* Persona */}
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

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descriptionError) setDescriptionError("");
                  }}
                  maxLength={200}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {description.length}/200
                </div>
                {descriptionError && (
                  <p className="text-red-600 text-sm mt-1">
                    {descriptionError}
                  </p>
                )}
              </div>
            </div>

            {/* Modal buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => dispatch({ type: "CLOSE_AGENT_MODAL" })}
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
    </div>
  );
}
