"use client";

import { useEffect, useState } from "react";
import { useApp } from "../state/AppProvider";
import AvatarDisplay from "./AvatarDisplay";

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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<"auto" | "emoji" | "url">("auto");
  const [customUrl, setCustomUrl] = useState("");
  const [verbosity, setVerbosity] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
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
        setAvatar(activeAgent.avatar || null);

        // Determine avatar type
        if (!activeAgent.avatar) {
          setAvatarType("auto");
        } else if (activeAgent.avatar.length <= 2) {
          setAvatarType("emoji");
        } else {
          setAvatarType("url");
          setCustomUrl(activeAgent.avatar);
        }
        setVerbosity(activeAgent.verbosity || "balanced");
      } else {
        setName("");
        setPersona("");
        setDescription("");
        setModel("gpt-4o-mini");
        setTemperature(0.7);
        setAvatar(null);
        setAvatarType("auto");
        setCustomUrl("");
        setVerbosity("balanced");
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
        payload: { ...activeAgent, name, persona, description, model, temperature, avatar, verbosity },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent updated.", type: "success" } });
    } else {
      const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      dispatch({
        type: "ADD_AGENT",
        payload: { id: newId, name, persona, description, model, temperature, avatar, verbosity },
      });
      dispatch({ type: "SET_BANNER", payload: { message: "Agent created.", type: "success" } });

      if (onAgentCreated) onAgentCreated(newId);
    }

    dispatch({ type: "CLOSE_AGENT_MODAL" });
  };

  if (!state.ui.isAgentModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-100 pb-4">
          {activeAgent ? "Edit Agent" : "Create New Agent"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left Column: Identity */}
          <div className="space-y-6 sm:border-r sm:pr-12 sm:border-slate-100">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded w-fit mb-4">Identity</h3>

            {/* Avatar Preview & Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Avatar
              </label>
              <div className="flex items-center gap-4 mb-3">
                <AvatarDisplay
                  agent={{ id: "preview", name: name || "Agent", avatar }}
                  size="xl"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-2">Choose style:</p>
                  <div className="flex gap-2">
                    {(['auto', 'emoji', 'url'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setAvatarType(type);
                          if (type === 'auto') setAvatar(null);
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          avatarType === type
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {avatarType === "emoji" && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600 mb-2">Select an emoji:</p>
                <div className="grid grid-cols-8 gap-2">
                  {["😀", "😎", "🤖", "👨‍💼", "👩‍💼", "🧑‍💻", "👨‍🔬", "👩‍🔬", "🦸", "🦹", "🧙", "🧚", "🚀", "⭐", "💎", "🔥"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`text-2xl p-2 rounded-lg hover:bg-white transition-all ${
                        avatar === emoji ? "bg-white ring-2 ring-indigo-500 shadow-sm scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {avatarType === "url" && (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    setAvatar(e.target.value);
                  }}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-slate-400">Direct link to an image file</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Agent Name
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
                <p className="text-red-600 text-xs mt-1 font-medium">{nameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Primary Persona
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
                <p className="text-red-600 text-xs mt-1 font-medium">{personaError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Detailed Description
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                rows={4}
                placeholder="What is this agent's specific focus?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (descriptionError) setDescriptionError("");
                }}
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-1">
                {descriptionError ? (
                  <p className="text-red-600 text-xs font-medium">{descriptionError}</p>
                ) : (
                  <div />
                )}
                <div className="text-xs text-slate-400 font-mono">
                  {description.length}/200
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Behavior */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded w-fit mb-4">Behavior</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  AI Model
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white shadow-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value as "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo")}
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient) ⚡</option>
                  <option value="gpt-4o">GPT-4o (High Intelligence) 🚀</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy) 💰</option>
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  {model === "gpt-4o-mini" && "Optimized for speed and high volume tasks."}
                  {model === "gpt-4o" && "Superior reasoning for complex strategy."}
                  {model === "gpt-3.5-turbo" && "Basic chat model for simple instructions."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
                  <span>Creativity (Temperature)</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {temperature.toFixed(1)}
                  </span>
                </label>
                <div className="relative pt-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200"
                    style={{
                      background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${temperature * 100}%, #e2e8f0 ${temperature * 100}%, #e2e8f0 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                    <span>PRECISE</span>
                    <span>BALANCED</span>
                    <span>CREATIVE</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  {temperature < 0.3 && "🎯 Produces highly consistent, predictable, and factual responses."}
                  {temperature >= 0.3 && temperature < 0.7 && "⚖️ Ideal for general conversation with a touch of variety."}
                  {temperature >= 0.7 && "🎨 Generates imaginative, diverse, and unconventional ideas."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Response Length
                </label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-xs">
                  <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl mb-4">
                    {([
                      { id: 'concise', label: 'Concise', icon: '📝' },
                      { id: 'balanced', label: 'Balanced', icon: '⚖️' },
                      { id: 'detailed', label: 'Detailed', icon: '📖' }
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVerbosity(opt.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                          verbosity === opt.id
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
                        }`}
                      >
                        <span className="text-sm">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-slate-600 leading-normal flex gap-2 items-start">
                    <span>💡</span>
                    <span>
                      {verbosity === 'concise' && "Keeps responses brief (1 paragraph max)."}
                      {verbosity === 'balanced' && "Thoughtful responses (2-3 paragraphs)."}
                      {verbosity === 'detailed' && "Comprehensive responses (3+ paragraphs)."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
          <button
            onClick={() => dispatch({ type: "CLOSE_AGENT_MODAL" })}
            className="px-6 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            {activeAgent ? "Save Changes" : "Create Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
