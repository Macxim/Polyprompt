"use client";

import { useState } from "react";
import AgentCard from "./components/AgentCard";
import AgentModal from "../components/AgentModal";
import Banner from "../components/Banner";
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
    <>
      <Banner maxWidth="3xl" />

      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agents</h1>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create Agent
        </button>
      </div>

      {/* Agent grid */}
      {state.agents.length === 0 ? (
        <div className="col-span-full py-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium text-lg mb-2">No agents yet</p>
            <p className="text-sm text-slate-500 mb-6">Create your first AI agent to get started with Polyprompt</p>
            <button
              onClick={() => {
                dispatch({ type: "CLEAR_ACTIVE_AGENT" });
                dispatch({ type: "OPEN_AGENT_MODAL" });
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg shadow-md transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Create Your First Agent
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {state.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

        <AgentModal />
      </div>
    </>
  );
}
