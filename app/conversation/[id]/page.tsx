"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useApp } from "../../state/AppProvider";
import ChatMessage from "../../components/ChatMessage";
import ThinkingIndicator from "../../components/ThinkingIndicator";
import Banner from "../../components/Banner";
import { Message, Agent } from "../../types";
import {
  Send,
  ArrowLeft,
  Users,
  Trash2,
  ChevronDown,
  Pencil,
  Check,
  Download,
  X
} from "lucide-react";

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function ConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state, dispatch } = useApp();

  const conversationId = params.id as string;

  // Find conversation
  const conversation = state.conversations.find(c => c.id === conversationId);

  // Get participating agents
  const participantAgents = state.agents.filter(a =>
    conversation?.participantIds?.includes(a.id)
  );

  // State
  const [input, setInput] = useState("");
  const [thinkingAgent, setThinkingAgent] = useState<Agent | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const processedTriggerRef = useRef(false);

  // Initialize from URL params
  useEffect(() => {
    const autoParam = searchParams.get("auto");
    const promptParam = searchParams.get("prompt");
    const triggerParam = searchParams.get("trigger");

    if (promptParam) {
      setInput(promptParam);
    }

    // Auto-trigger debate/response if requested (e.g. from home page)
    // Auto-trigger debate/response if requested (e.g. from home page)
    if (triggerParam === "true" && conversation && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage.role === "user" && !thinkingAgent && !processedTriggerRef.current) {
        // processing lock
        processedTriggerRef.current = true;

        // Remove the trigger param to prevent double-execution
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete("trigger");
        router.replace(`/conversation/${conversationId}?${newSearchParams.toString()}`);

        if (participantAgents.length >= 2) {
           runDebate(lastMessage.content);
        } else if (participantAgents.length > 0) {
           getAgentResponse(participantAgents[0], lastMessage.content);
        }
      }
    }
  }, [searchParams, conversation, participantAgents, thinkingAgent, router, conversationId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, scrollToBottom]);

  // Handle scroll for show/hide scroll button
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !conversation) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    dispatch({
      type: "ADD_MESSAGE",
      payload: { conversationId, message: userMessage },
    });

    setInput("");

    // If we have 2+ agents, trigger debate
    if (participantAgents.length >= 2) {
      await runDebate(userMessage.content);
    } else if (participantAgents.length > 0) {
      // Single agent response
      await getAgentResponse(participantAgents[0], userMessage.content);
    }
  };

  // Get single agent response
  const getAgentResponse = async (agent: Agent, userContent: string) => {
    setThinkingAgent(agent);

    const agentMessage: Message = {
      id: generateId(),
      role: "agent",
      content: "",
      agentId: agent.id,
      agentName: agent.name,
      timestamp: Date.now(),
      isStreaming: true,
    };

    dispatch({
      type: "ADD_MESSAGE",
      payload: { conversationId, message: agentMessage },
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userContent }],
          agent,
          conversationHistory: conversation?.messages || [],
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullContent += chunk;

        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            conversationId,
            messageId: agentMessage.id,
            content: fullContent.replace(/__TOKENS__.*$/, ""),
          },
        });
      }
    } catch (error) {
      console.error("Error getting agent response:", error);
    } finally {
      setThinkingAgent(null);
    }
  };

  // Run debate (simplified - calls debate-plan then executes)
  const runDebate = async (userContent: string) => {
    try {
      // Get debate plan
      const planResponse = await fetch("/api/debate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userContent,
          agents: participantAgents,
        }),
      });

      if (!planResponse.ok) {
        dispatch({
          type: "SET_BANNER",
          payload: { message: "Failed to plan debate", type: "error" },
        });
        return;
      }

      const plan = await planResponse.json();
      const options = plan.options || [];

      // Execute each step in the plan
      for (const step of plan.plan) {
        const agent = participantAgents.find(a => a.id === step.agentId);
        if (!agent) continue;

        setThinkingAgent(agent);

        const stepMessage: Message = {
          id: generateId(),
          role: "agent",
          content: "",
          agentId: agent.id,
          agentName: agent.name,
          timestamp: Date.now(),
          isStreaming: true,
          stance: step.targetPosition || undefined,
          round: step.round,
          phase: step.phase,
          isSummary: step.type === "summary",
        };

        dispatch({
          type: "ADD_MESSAGE",
          payload: { conversationId, message: stepMessage },
        });

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: step.instruction || userContent }],
            agent,
            conversationHistory: conversation?.messages || [],
            debateTurn: step.type,
            targetPosition: step.targetPosition,
            options,
            round: step.round,
            phase: step.phase,
          }),
        });

        if (!response.ok) continue;

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullContent += chunk;

          dispatch({
            type: "UPDATE_MESSAGE",
            payload: {
              conversationId,
              messageId: stepMessage.id,
              content: fullContent.replace(/__TOKENS__.*$/, ""),
            },
          });
        }

        // Small delay between agents
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error("Error running debate:", error);
      dispatch({
        type: "SET_BANNER",
        payload: { message: "Error during debate", type: "error" },
      });
    } finally {
      setThinkingAgent(null);
    }
  };

  // Rename conversation
  const handleRename = () => {
    if (editedTitle.trim() && conversation) {
      dispatch({
        type: "RENAME_CONVERSATION",
        payload: { conversationId, newTitle: editedTitle.trim() },
      });
      setIsEditingTitle(false);
    }
  };

  // Delete conversation
  const handleDelete = () => {
    if (confirm("Delete this conversation?")) {
      dispatch({
        type: "DELETE_CONVERSATION",
        payload: { id: conversationId },
      });
      router.push("/");
    }
  };

  // Export conversation
  const handleExport = (format: "markdown" | "json") => {
    if (!conversation) return;

    let content = "";
    let type = "";
    let extension = "";

    if (format === "json") {
      content = JSON.stringify(conversation, null, 2);
      type = "application/json";
      extension = "json";
    } else {
      content = conversation.messages
        .map(m => {
          const role = m.role === "user" ? "User" : m.agentName || "Agent";
          return `### ${role} (${new Date(m.timestamp || Date.now()).toLocaleString()})\n\n${m.content}\n\n---\n`;
        })
        .join("\n");
      type = "text/markdown";
      extension = "md";
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conversation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Loading state
  if (!state._hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  // Not found
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-500">Conversation not found</p>
        <button
          onClick={() => router.push("/")}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Banner maxWidth="4xl" />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                />
                <button onClick={handleRename} className="text-green-600 hover:text-green-700">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingTitle(false)} className="text-slate-400 hover:text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-none">
                  {conversation.title}
                </h1>
                <button
                  onClick={() => {
                    setEditedTitle(conversation.title);
                    setIsEditingTitle(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>{participantAgents.length}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Export conversation"
              >
                <Download className="w-4 h-4" />
              </button>

              {showExportMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => handleExport("markdown")}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                  >
                    Export as Markdown
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                  >
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Start the conversation below</p>
            </div>
          ) : (
            conversation.messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                agents={state.agents}
                allMessages={conversation.messages}
              />
            ))
          )}

          {thinkingAgent && (
            <ThinkingIndicator agentName={thinkingAgent.name} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 p-3 bg-white border border-slate-200 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <ChevronDown className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Input */}
      <footer className="bg-white border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question..."
                rows={1}
                className="w-full resize-none border border-slate-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !!thinkingAgent}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center mt-3">
             <p className="text-xs text-slate-400">AI agents can make mistakes. Please double-check responses.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
