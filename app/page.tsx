"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "./state/AppProvider";
import Banner from "./components/Banner";
import posthog from 'posthog-js';
import {
  Plus,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Cpu,
  Zap,
  Users,
  Check
} from "lucide-react";

// Basic ID generator safe for all environments
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Default agent IDs to pre-select
const DEFAULT_AGENT_IDS = ["strategic_analyst", "devils_advocate", "creative_ideator"];

export default function Home() {
  const { dispatch, state } = useApp();
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(DEFAULT_AGENT_IDS);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  const MAX_LENGTH = 500;

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleStartConversation = () => {
    if (!question.trim()) {
      questionInputRef.current?.focus();
      return;
    }

    if (selectedAgentIds.length < 2) {
      dispatch({
        type: "SET_BANNER",
        payload: { message: "Please select at least 2 agents for a debate.", type: "error" },
      });
      return;
    }

    const conversationId = generateId();

    // Create the conversation with the first user message
    dispatch({
      type: "ADD_CONVERSATION",
      payload: {
        id: conversationId,
        title: question.substring(0, 50) + (question.length > 50 ? "..." : ""),
        messages: [{
          id: generateId(),
          role: "user",
          content: question,
          timestamp: Date.now(),
        }],
        participantIds: selectedAgentIds,
        updatedAt: Date.now(),
      },
    });

    // Track conversation creation
    posthog.capture('conversation_created', {
      conversation_id: conversationId,
      agent_count: selectedAgentIds.length
    });

    // Navigate to the conversation
    router.push(`/conversation/${conversationId}?trigger=true`);
  };

  // Filter visible agents
  const visibleAgents = state.agents.filter(a => !a.isHidden);

  return (
    <>
      <Banner maxWidth="6xl" />

      <div className="flex flex-col min-h-screen">
        {/* Loading State */}
        {!state._hydrated ? (
          <section className="bg-gradient-to-b from-slate-50/50 to-white border-b border-slate-100 py-16 px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-200/50 mb-6 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Loading your workspace...</h2>
              <p className="text-slate-400 text-sm mb-8">Preparing your conversations and agents</p>
            </div>
          </section>
        ) : (
          <>
            {/* Hero / New Conversation Section */}
            <section className="relative pt-12 sm:pt-16 overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
              </div>

              <div className="max-w-4xl mx-auto px-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6">
                  <Sparkles className="w-3 h-3" />
                  Multi-Agent Debates
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-[1.1]">
                  Ask a question, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                    get a debate.
                  </span>
                </h1>

                <p className="text-slate-500 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                  AI agents argue different perspectives so you can make better decisions.
                </p>

                {/* Question Input */}
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
                    <div className="relative bg-white rounded-2xl border border-slate-200/60 shadow-xl p-4">
                      <textarea
                        ref={questionInputRef}
                        className="w-full bg-transparent text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none text-base resize-none"
                        value={question}
                        rows={3}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_LENGTH) {
                            setQuestion(e.target.value);
                          }
                        }}
                        placeholder="Should I take the $100k job I hate or the $60k job I love?"
                      />

                      {/* Agent Selection Toggle */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setShowAgentPicker(!showAgentPicker)}
                          className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span>{selectedAgentIds.length} agents selected</span>
                        </button>

                        <button
                          onClick={handleStartConversation}
                          disabled={!question.trim() || selectedAgentIds.length < 2}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                          Start Debate
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Picker */}
                {showAgentPicker && (
                  <div className="max-w-2xl mx-auto mb-8 bg-white rounded-2xl border border-slate-200 shadow-lg p-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 text-left">Which agents should join?</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {visibleAgents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => toggleAgent(agent.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                            selectedAgentIds.includes(agent.id)
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            selectedAgentIds.includes(agent.id)
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-200"
                          }`}>
                            {selectedAgentIds.includes(agent.id) && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-medium truncate">{agent.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 text-left">
                      Select at least 2 agents for a debate
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Conversations */}
            {state.conversations.length > 0 && (
              <section className="py-12 px-8 max-w-4xl mx-auto w-full">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Recent Conversations</h2>
                  <p className="text-slate-500 text-sm">Continue where you left off</p>
                </div>

                <div className="grid gap-4">
                  {[...state.conversations]
                    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                    .slice(0, 10)
                    .map((conv) => {
                      const agentCount = conv.participantIds?.length || 0;
                      const messageCount = conv.messages.length;

                      return (
                        <Link
                          key={conv.id}
                          href={`/conversation/${conv.id}`}
                          className="group p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                {conv.title}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  {agentCount} agents
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {messageCount} messages
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </section>
            )}

            {/* Features for New Users */}
            {state.conversations.length === 0 && (
              <section className="bg-slate-50/50 border-y border-slate-100 py-10 px-8 mt-8">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">How it works</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-3">
                        <Plus className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">1. Ask a question</h3>
                      <p className="text-slate-500 text-sm">Type any decision you're facing or topic you want explored.</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">2. Agents debate</h3>
                      <p className="text-slate-500 text-sm">AI agents argue different sides, challenging assumptions.</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200">
                      <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-3">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">3. Get clarity</h3>
                      <p className="text-slate-500 text-sm">A synthesis gives you specific conditions for each choice.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
