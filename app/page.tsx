"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useApp } from "./state/AppProvider";
import Banner from "./components/Banner";
import posthog from 'posthog-js';
import {
  Plus,
  Layers,
  Sparkles,
  Rocket,
  MessageSquare,
  ArrowRight,
  Layout,
  Cpu,
  Zap,
  Users
} from "lucide-react";

// Basic ID generator safe for all environments
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function Home() {
  const { dispatch, state } = useApp();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const MAX_LENGTH = 40;

  const handleAddSpace = () => {
    if (!name.trim()) {
      setNameError("Space name is required");
      nameInputRef.current?.focus();
      return;
    }

    if (name.length > MAX_LENGTH) {
      setNameError(`Name cannot exceed ${MAX_LENGTH} characters`);
      nameInputRef.current?.focus();
      return;
    }

    const spaceId = generateId();

    dispatch({
      type: "ADD_SPACE",
      payload: {
        id: spaceId,
        name,
        agentIds: [],
        conversations: [],
      },
    });

    // Track space creation
    posthog.capture('space_created', {
      space_id: spaceId,
      space_name: name
    });

    dispatch({
      type: "SET_BANNER",
      payload: { message: "Space created successfully.", type: "success" },
    });

    setName("");
  };

  return (
    <>
      <Banner maxWidth="6xl" />

      <div className="flex flex-col min-h-screen">
        {/* Conditional Hero: Loading, Compact for returning users, or Full for new users */}
        {!state._hydrated ? (
          // Engaging Loading State with branding
          <section className="bg-gradient-to-b from-slate-50/50 to-white border-b border-slate-100 py-16 px-8">
            <div className="max-w-6xl mx-auto">
              {/* Animated Logo/Brand Element */}
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-200/50 mb-6 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Loading Text */}
              <h2 className="text-xl font-bold text-slate-700 mb-2">Loading your workspace...</h2>
              <p className="text-slate-400 text-sm mb-8">Preparing your spaces and agents</p>

              {/* Premium Skeleton Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="glass-card p-6 rounded-3xl border border-slate-200/60 bg-white/60 shadow-sm"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="animate-pulse">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl mb-4"></div>
                      <div className="h-5 bg-slate-100 rounded-lg w-3/4 mb-3"></div>
                      <div className="h-3 bg-slate-50 rounded-md w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : state.spaces.length > 0 ? (
          // Compact Dashboard Header for Returning Users
          <section className="bg-gradient-to-b from-slate-50/50 to-white border-b border-slate-100 py-8">
            <div className="max-w-6xl mx-auto p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Create a new Space</h1>
                  <p className="text-slate-500 text-sm mt-1">Manage your AI-powered projects</p>
                </div>
              </div>

              {/* Inline Compact Space Creation */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-2xl">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Plus className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= MAX_LENGTH) {
                        setName(value);
                        if (nameError) setNameError("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && name.trim()) {
                        e.preventDefault();
                        handleAddSpace();
                      }
                    }}
                    placeholder="Create a new space..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm"
                  />
                </div>
                <button
                  onClick={handleAddSpace}
                  disabled={!name.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
                >
                  <span className="hidden sm:inline">Create</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          // Full Hero Section for New Users
          <>
            <section className="relative pt-12 sm:pt-20 overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse-gentle"></div>
              </div>

              <div className="max-w-6xl mx-auto px-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Sparkles className="w-3 h-3" />
                  Agentic Intelligence Platform
                </div>

                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 leading-[1.1]">
                  Your AI Workforce, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                    Orchestrated.
                  </span>
                </h1>

                <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 leading-relaxed font-medium px-4 sm:px-0">
                  Polyprompt provides specialized spaces to organize AI agents, projects, and multi-agent discussions in one seamless environment.
                </p>

                {/* Premium Create Space Area */}
                <div className="max-w-xl mx-auto mb-16 px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col sm:flex-row gap-2 p-2 bg-white rounded-[24px] sm:rounded-[24px] border border-slate-200/60 shadow-xl shadow-indigo-100/20 ring-1 ring-slate-100/50">
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                          <Plus className="w-5 h-5" />
                        </div>
                        <input
                          ref={nameInputRef}
                          className="w-full pl-12 pr-4 py-4 bg-transparent text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none text-base sm:text-lg"
                          value={name}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= MAX_LENGTH) {
                              setName(value);
                              if (nameError) setNameError("");
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSpace();
                            }
                          }}
                          placeholder="Start a new space..."
                        />
                      </div>
                      <button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 sm:px-8 py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                        onClick={handleAddSpace}
                      >
                        <span className="inline sm:hidden">Launch</span>
                        <span className="hidden sm:inline">Launch Space</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Counter/Error */}
                  <div className="flex justify-between items-center mt-3 px-4">
                    {nameError ? (
                      <p className="text-red-500 text-xs font-bold flex items-center gap-1">
                        <span className="text-sm">⚠️</span> {nameError}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        Create a dedicated space for your next project
                      </p>
                    )}
                    <div className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${name.length > (MAX_LENGTH * 0.8) ? 'text-amber-500' : 'text-slate-400'}`}>
                      {name.length} / {MAX_LENGTH}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-slate-50/50 border-y border-slate-100 py-10 px-8">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Platform Capabilities</h2>
                  <p className="text-slate-500">Everything you need to orchestrate your AI workforce</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="glass-card p-6 rounded-3xl border border-slate-200/60 bg-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                      <Layout className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Dedicated Spaces</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Keep related agents and discussions organized in distinct environments tailored to specific projects.
                    </p>
                  </div>

                  <div className="glass-card p-6 rounded-3xl border border-slate-200/60 bg-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Agent Workforce</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Assign specialized AI experts to each space to collaborate on high-complexity tasks and research.
                    </p>
                  </div>

                  <div className="glass-card p-6 rounded-3xl border border-slate-200/60 bg-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 shadow-sm">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Auto-Orchestration</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Initiate multi-agent discussions where experts debate and refine ideas autonomously until complete.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* List spaces - Prioritized Section */}
        <section className="py-12 px-8 max-w-6xl mx-auto w-full">
          {state._hydrated && state.spaces.length > 0 && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your Spaces</h2>
                <p className="text-slate-500 text-sm">Jump back into your ongoing projects.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {state.spaces.map((space) => {
                  const agentCount = state.agents.filter(a => (space.agentIds || []).includes(a.id)).length;
                  const chatCount = space.conversations.length;

                  return (
                    <Link key={space.id} href={`/space/${space.id}`} className="block h-full transition-transform hover:scale-[1.02] active:scale-[0.98]">
                      <div className="glass-card group p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-2xl hover:border-indigo-300/50 transition-all cursor-pointer h-full relative overflow-hidden bg-white/60 backdrop-blur-md">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors"></div>

                        <div className="flex items-start justify-between mb-6">
                           <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                              <Rocket className="w-6 h-6" />
                           </div>
                        </div>

                        <h2 className="font-bold text-xl text-slate-800 mb-4 truncate group-hover:text-indigo-700 transition-colors">{space.name}</h2>

                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>{agentCount === 0 ? 'No agents' : agentCount === 1 ? '1 Agent' : `${agentCount} Agents`}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4" />
                            <span>{chatCount === 0 ? 'No chats' : chatCount === 1 ? '1 Chat' : `${chatCount} Chats`}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
