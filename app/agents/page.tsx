"use client";

import { useState } from "react";
import AgentCard from "./components/AgentCard";
import AgentModal from "../components/AgentModal";
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
        payload: { id: Date.now().toString(36) + Math.random().toString(36).substr(2), name, persona, description },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent created." } });
    }

    dispatch({ type: "CLOSE_AGENT_MODAL" });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Banner */}
      {state.ui.bannerMessage && (
        <div className="mb-4 border border-green-500 bg-green-50 text-green-800 px-4 py-3 rounded flex justify-between items-start">
          <span>{state.ui.bannerMessage.message}</span>
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

      <AgentModal />
    </div>
  );
}
