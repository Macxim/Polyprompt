"use client";

import { useEffect, useState } from "react";
import { useApp } from "../state/AppProvider";

type Props = {
  // Optional callback when a new agent is created,
  // useful for SpacePage to link the new agent to the space.
  onAgentCreated?: (agentId: string) => void;
};

export default function AgentModal({ onAgentCreated }: Props) {
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

  // Sync with active agent or reset when modal opens
  useEffect(() => {
    if (state.ui.isAgentModalOpen) {
      if (activeAgent) {
        setName(activeAgent.name);
        setPersona(activeAgent.persona);
        setDescription(activeAgent.description || "");
      } else {
        setName("");
        setPersona("");
        setDescription("");
      }
      setNameError("");
      setPersonaError("");
      setDescriptionError("");
    }
  }, [state.ui.isAgentModalOpen, activeAgent]);

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
      const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      dispatch({
        type: "ADD_AGENT",
        payload: { id: newId, name, persona, description },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent created." } });

      if (onAgentCreated) onAgentCreated(newId);
    }

    dispatch({ type: "CLOSE_AGENT_MODAL" });
  };

  if (!state.ui.isAgentModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">
          {activeAgent ? "Edit Agent" : "Create New Agent"}
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
            <label className="block text-sm font-medium mb-1">Persona</label>
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
            <label className="block text-sm font-medium mb-1">Description</label>
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
              <p className="text-red-600 text-sm mt-1">{descriptionError}</p>
            )}
          </div>
        </div>

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
  );
}
