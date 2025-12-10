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
  const [model, setModel] = useState<"gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo">("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
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
        setModel(activeAgent.model || "gpt-4o-mini");
        setTemperature(activeAgent.temperature ?? 0.7);
      } else {
        setName("");
        setPersona("");
        setDescription("");
        setModel("gpt-4o-mini");
        setTemperature(0.7);
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
        payload: { ...activeAgent, name, persona, description, model, temperature },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent updated." } });
    } else {
      const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      dispatch({
        type: "ADD_AGENT",
        payload: { id: newId, name, persona, description, model, temperature },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent created." } });

      if (onAgentCreated) onAgentCreated(newId);
    }

    dispatch({ type: "CLOSE_AGENT_MODAL" });
  };

  if (!state.ui.isAgentModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          {activeAgent ? "Edit Agent" : "Create New Agent"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g., Marketing Expert"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              autoFocus={!activeAgent}
            />
            {nameError && (
              <p className="text-red-600 text-sm mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Persona
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g., Expert copywriter with 10 years experience"
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              AI Model
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
              value={model}
              onChange={(e) => setModel(e.target.value as "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo")}
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap) ⚡</option>
              <option value="gpt-4o">GPT-4o (Most Capable) 🚀</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy) 💰</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {model === "gpt-4o-mini" && "Best balance of speed and quality. ~$0.15 per 1M tokens."}
              {model === "gpt-4o" && "Most advanced model. ~$2.50 per 1M tokens."}
              {model === "gpt-3.5-turbo" && "Older model, cheapest option. ~$0.50 per 1M tokens."}
            </p>
          </div>


          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Temperature: {temperature.toFixed(1)}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {temperature < 0.3 && "🎯 Focused & Deterministic"}
                {temperature >= 0.3 && temperature < 0.7 && "⚖️ Balanced"}
                {temperature >= 0.7 && "🎨 Creative & Varied"}
              </span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,
                    rgba(59, 130, 246, 0.3) 0%,
                    rgba(99, 102, 241, 0.3) ${temperature * 50}%,
                    rgba(168, 85, 247, 0.3) ${temperature * 100}%,
                    rgba(236, 72, 153, 0.3) 100%)`,
                }}
              />
              <style jsx>{`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: white;
                  border: 2px solid ${temperature < 0.3 ? 'rgba(59, 130, 246, 0.6)' : temperature < 0.7 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(168, 85, 247, 0.6)'};
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  cursor: pointer;
                  transition: all 0.2s;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: white;
                  border: 2px solid ${temperature < 0.3 ? 'rgba(59, 130, 246, 0.6)' : temperature < 0.7 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(168, 85, 247, 0.6)'};
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  cursor: pointer;
                  transition: all 0.2s;
                }
                input[type="range"]::-moz-range-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
                }
              `}</style>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0.0 (Precise)</span>
              <span>0.5 (Moderate)</span>
              <span>1.0 (Creative)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {temperature < 0.3 && "Low temperature produces consistent, focused responses. Best for factual tasks."}
              {temperature >= 0.3 && temperature < 0.7 && "Balanced temperature for general-purpose conversations."}
              {temperature >= 0.7 && "High temperature produces more creative and varied responses. Best for brainstorming."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
              rows={3}
              placeholder="Optional description..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (descriptionError) setDescriptionError("");
              }}
              maxLength={200}
            />
            <div className="flex justify-between items-center mt-1">
              {descriptionError ? (
                <p className="text-red-600 text-sm">{descriptionError}</p>
              ) : (
                <div></div>
              )}
              <div className="text-xs text-slate-400">
                {description.length}/200
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => dispatch({ type: "CLOSE_AGENT_MODAL" })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
          >
            {activeAgent ? "Update Agent" : "Create Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
