"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { Message } from "../../../../types";
import ReactMarkdown from "react-markdown";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import ThinkingIndicator from "@/app/components/ThinkingIndicator";
import AutoModeModal from "@/app/components/AutoModeModal";

export default function ConversationPage() {
  const { state, dispatch } = useApp();
  const params = useParams();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const autoModeTrigger = searchParams.get('auto');

  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Validate params
  if (
    !params.id ||
    Array.isArray(params.id) ||
    !params.convId ||
    Array.isArray(params.convId)
  ) {
    return <p className="p-8 text-center text-slate-500">Invalid conversation URL</p>;
  }

  const spaceId = params.id;
  const convId = params.convId;

  // Find the space and conversation
  const space = state.spaces.find((s) => s.id === spaceId);
  const conversation = space?.conversations.find((c) => c.id === convId);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isTyping]);

  // Handle Auto Mode Trigger from URL
  useEffect(() => {
    if (autoModeTrigger === 'true' && !isAutoMode && conversation && conversation.messages.length > 0) {
      // If we have a starting prompt (first user message), treat it as the topic
      const lastUserMsg = [...conversation.messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
         // Clear the query param to prevent re-triggering?
         // Actually better to just check if we haven't started yet.
         // We trigger "Deep Dive" by default for important templates, or maybe "Quick Debate"?
         // Let's default to "deep" for comprehensive templates.
         handleAutoDiscuss('deep', lastUserMsg.content);
      }
    }
  }, [autoModeTrigger, conversation?.messages]);

  if (!space || !conversation) return <p className="p-8 text-center text-slate-500">Conversation not found.</p>;

  // Model pricing per 1M tokens
  const MODEL_PRICING = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  } as const;

  // Calculate total tokens and cost for conversation
  const calculateTotals = () => {
    let totalTokens = 0;
    let totalCost = 0;

    conversation.messages.forEach(msg => {
      if (msg.tokens) {
        totalTokens += msg.tokens.total;

        // Get model from agent or default to gpt-4o-mini
        const agent = state.agents.find(a => a.id === msg.agentId);
        const model = agent?.model || 'gpt-4o-mini';
        const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];

        const inputCost = (msg.tokens.prompt / 1_000_000) * pricing.input;
        const outputCost = (msg.tokens.completion / 1_000_000) * pricing.output;
        totalCost += inputCost + outputCost;
      }
    });

    return { totalTokens, totalCost };
  };

  const { totalTokens, totalCost } = calculateTotals();

  // Format token count (e.g., 1.2K, 15K, 1.5M)
  const formatTokens = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // Handle sending a new message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      role: "user",
      content: newMessage,
      agentName: "User",
      timestamp: Date.now(),
    };

    // 1. Add user message
    dispatch({
      type: "ADD_MESSAGE",
      payload: { spaceId, conversationId: convId, message: userMessage },
    });

    setNewMessage("");
    setIsTyping(true);

    // Filter agents based on conversation participants if defined, otherwise use all space agents
    const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
    const spaceAgents = conversation.participantIds
      ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
      : allSpaceAgents;

    if (spaceAgents.length === 0) {
      setIsTyping(false);
      dispatch({
        type: "SET_BANNER",
        payload: { message: "No agents available in this space." },
      });
      return;
    }

    // Parse @mentions from the message
    const mentionMatches = newMessage.match(/@(\w+)/g);
    const mentionedNames = mentionMatches?.map(m => m.slice(1).toLowerCase()) || [];

    // Filter agents: if mentions exist, only invoke mentioned agents; otherwise invoke all
    const agentsToInvoke = mentionedNames.length > 0
      ? spaceAgents.filter(agent => mentionedNames.includes(agent.name.toLowerCase()))
      : spaceAgents;

    if (agentsToInvoke.length === 0 && mentionedNames.length > 0) {
      setIsTyping(false);
      dispatch({
        type: "SET_BANNER",
        payload: { message: "No matching agents found for your @mentions." },
      });
      return;
    }

    try {
      // Process each agent sequentially
      for (const agent of agentsToInvoke) {
        // Create a temporary message for streaming
        const agentMsgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const initialAgentMessage: Message = {
          id: agentMsgId,
          role: "agent",
          content: "",
          agentId: agent.id,
          agentName: agent.name,
          timestamp: Date.now(),
          isStreaming: true,
        };

        // Add empty agent message
        dispatch({
          type: "ADD_MESSAGE",
          payload: { spaceId, conversationId: convId, message: initialAgentMessage },
        });

        // Call the chat API for this agent
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [userMessage],
            agent: {
              name: agent.name,
              persona: agent.persona,
              model: agent.model || "gpt-4o-mini",
              temperature: agent.temperature ?? 0.7,
            },
            conversationHistory: conversation.messages,
          }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        // Stream the response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = "";
        let tokenUsage = null;

        while (true) {
          const { done, value} = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Check for token usage marker
          if (chunk.includes('__TOKENS__')) {
            const parts = chunk.split('__TOKENS__');
            streamedContent += parts[0];

            try {
              tokenUsage = JSON.parse(parts[1]);
            } catch (e) {
              console.error('Failed to parse token usage:', e);
            }
          } else {
            streamedContent += chunk;
          }

          // Update the message content
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: {
              spaceId,
              conversationId: convId,
              messageId: agentMsgId,
              content: streamedContent,
            },
          });
        }

        // Mark streaming as complete with token data
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            spaceId,
            conversationId: convId,
            messageId: agentMsgId,
            content: streamedContent,
            tokens: tokenUsage,
          },
        });

        // Small delay between agents for better UX
        if (spaceAgents.indexOf(agent) < spaceAgents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      dispatch({
        type: "SET_BANNER",
        payload: {
          message: error.message === "API error: 401"
            ? "Invalid API key. Please check your .env.local file."
            : "Failed to get response. Please try again."
        },
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Helper function to send an agent message (used by Auto Mode)
  const sendAgentMessage = async (agent: any, systemInstruction: string) => {
    // strict requirement: we must use the LATEST conversation messages state
    // But since state updates are async, we rely on passing the current history or updating it optimistically
    // For auto-mode, we will re-fetch the latest history or rely on the dispatch updates which are synchronous in our reducer?
    // Actually, reducers are sync but React state updates trigger re-renders.
    // We should rely on the state from the store if possible, but inside a loop we might need to manually track the temporary history.

    // For simplicity in this V1, we'll append to a local history array during the loop
    // But actually, we can just use the updated `conversation.messages` if we break the loop or use a ref.

    // Let's rely on the fact that dispatch updates the global store synchronously?
    // No, React Context updates are not synchronous for reading in the same render cycle.
    // So we will maintain a `currentHistory` array within the `handleAutoDiscuss` function.
  };

  const handleAutoDiscuss = async (mode: 'quick' | 'deep', explicitTopic?: string) => {
    const topic = explicitTopic || newMessage.trim();

    if (!topic) {
      dispatch({ type: "SET_BANNER", payload: { message: "Please enter a topic first." } });
      return;
    }

    const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
    const spaceAgents = conversation.participantIds
      ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
      : allSpaceAgents;
    if (spaceAgents.length < 2) {
       dispatch({ type: "SET_BANNER", payload: { message: "Auto-mode requires at least 2 agents in the space." } });
       return;
    }

    setIsAutoMode(true);
    setIsTyping(true);

    try {
      // 1. Send User Prompt
      const userMessage: Message = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        role: "user",
        content: topic,
        agentName: "User",
        timestamp: Date.now(),
      };

      dispatch({
        type: "ADD_MESSAGE",
        payload: { spaceId, conversationId: convId, message: userMessage },
      });
      setNewMessage("");

      // 2. Call Planner API
      // Create a temporary loading indicator
      dispatch({ type: "SET_BANNER", payload: { message: "Planning discussion..." } });

      // Clear input and modal
      setNewMessage("");
      setIsAutoModalOpen(false);

      const planRes = await fetch("/api/auto-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.content,
          agents: spaceAgents.map(a => ({ id: a.id, name: a.name, persona: a.persona })),
          mode
        }),
      });

      if (!planRes.ok) throw new Error("Failed to plan discussion");
      const { plan } = await planRes.json();

      if (!plan || plan.length === 0) {
        throw new Error("No plan generated");
      }

      dispatch({ type: "SET_BANNER", payload: { message: `Auto-discussion started: ${plan.length} turns planned.` } });

      // 3. Execute the Plan
      // We need to track history locally because react state won't update fast enough in this loop?
      // Actually, we can just re-read `conversation.messages` if we were using a ref, but `conversation` is a prop/derived state.
      // So let's build a local `history` array starting with current messages + new user message
      let history = [...conversation.messages, userMessage];

      for (const step of plan) {
        const agent = spaceAgents.find(a => a.id === step.agentId) || spaceAgents[0]; // Fallback if ID mismatch

        // UI Scroll
        scrollToBottom();

        // Create placeholder for agent
        const agentMsgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const initialAgentMessage: Message = {
          id: agentMsgId,
          role: "agent",
          content: "",
          agentId: agent.id,
          agentName: agent.name,
          timestamp: Date.now(),
          isStreaming: true,
          isSummary: step.type === 'summary'
        };

        dispatch({
          type: "ADD_MESSAGE",
          payload: { spaceId, conversationId: convId, message: initialAgentMessage },
        });

        // Add to local history for next context
        const messageForHistory = { ...initialAgentMessage, content: "" }; // Will update content later

        // Call Chat API with specific instruction
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "system", content: `Instruction for this turn: ${step.instruction}` }, ...history],
            agent: {
              name: agent.name,
              persona: agent.persona,
              model: agent.model || "gpt-4o-mini",
              temperature: agent.temperature ?? 0.7,
            },
            conversationHistory: history, // We might need to handle this carefully if the API uses one vs the other
          }),
        });

        if (!res.ok || !res.body) throw new Error("Chat API failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = "";
        let tokenUsage = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          if (chunk.includes('__TOKENS__')) {
            const parts = chunk.split('__TOKENS__');
            streamedContent += parts[0];
            try { tokenUsage = JSON.parse(parts[1]); } catch (e) {}
          } else {
            streamedContent += chunk;
          }

          dispatch({
            type: "UPDATE_MESSAGE",
            payload: { spaceId, conversationId: convId, messageId: agentMsgId, content: streamedContent },
          });
        }

        // Finalize message
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: { spaceId, conversationId: convId, messageId: agentMsgId, content: streamedContent, tokens: tokenUsage },
        });

        // Update local history for next iteration
        messageForHistory.content = streamedContent;
        history.push(messageForHistory);

        // Small delay between turns
        if (!step.type || step.type !== 'summary') {
           setIsThinking(true);
           await new Promise(resolve => setTimeout(resolve, 800));
           setIsThinking(false);
        }
      }

      dispatch({ type: "SET_BANNER", payload: { message: "Auto-discussion complete." } });

    } catch (error: any) {
      console.error("Auto-discuss error:", error);
      dispatch({ type: "SET_BANNER", payload: { message: "Auto-discuss failed. " + error.message } });
    } finally {
      setIsAutoMode(false);
      setIsTyping(false);
    }
  };

  const startAutoMode = (topic: string, mode: 'quick' | 'deep') => {
    setIsAutoModalOpen(false);
    handleAutoDiscuss(mode, topic);
  };

  // Export functions
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
    const spaceAgents = conversation.participantIds
      ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
      : allSpaceAgents;
    let content = `# ${conversation.title}\n\n`;
    content += `*Exported on ${new Date().toLocaleString()}*\n\n`;
    content += `---\n\n`;

    conversation.messages.forEach(msg => {
      const agentInfo = msg.role === 'agent' && msg.agentId
        ? spaceAgents.find(a => a.id === msg.agentId)
        : null;
      const name = msg.role === 'user' ? 'User' : (msg.agentName || 'Agent');
      const persona = agentInfo?.persona ? ` *(${agentInfo.persona})*` : '';

      content += `**${name}**${persona}\n\n${msg.content}\n\n---\n\n`;
    });

    const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.md`;
    downloadFile(content, filename, 'text/markdown');
    setShowExportMenu(false);
  };

  const exportAsJSON = () => {
    const exportData = {
      title: conversation.title,
      exportedAt: new Date().toISOString(),
      messageCount: conversation.messages.length,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        agentName: msg.agentName,
        agentId: msg.agentId,
        timestamp: msg.timestamp,
      })),
    };

    const content = JSON.stringify(exportData, null, 2);
    const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
    downloadFile(content, filename, 'application/json');
    setShowExportMenu(false);
  };

  const exportAsPlainText = () => {
    let content = `${conversation.title}\n`;
    content += `Exported on ${new Date().toLocaleString()}\n`;
    content += `${'='.repeat(50)}\n\n`;

    conversation.messages.forEach(msg => {
      const name = msg.role === 'user' ? 'User' : (msg.agentName || 'Agent');
      content += `${name}:\n${msg.content}\n\n`;
    });

    const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.txt`;
    downloadFile(content, filename, 'text/plain');
    setShowExportMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="glass-panel sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => router.push(`/space/${spaceId}`)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100/80 text-slate-500 transition-colors"
            title="Back to Space"
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
             <input
               type="text"
               defaultValue={conversation.title}
               onBlur={(e) => {
                 const newTitle = e.target.value.trim();
                 if (newTitle && newTitle !== conversation.title) {
                   dispatch({
                     type: "RENAME_CONVERSATION",
                     payload: { spaceId, conversationId: convId, newTitle },
                   });
                 } else {
                   e.target.value = conversation.title; // Reset if empty
                 }
               }}
               onKeyDown={(e) => {
                 if (e.key === "Enter") {
                   e.currentTarget.blur();
                 }
               }}
               className="text-lg font-bold text-slate-800 leading-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors w-full sm:w-auto"
             />
              <div className="flex items-center gap-3 text-xs">
                <p className="text-slate-500 font-medium">{spaceAgentsCount(state, space, conversation)} Agents active</p>
                {totalTokens > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <p className="text-slate-500 font-medium">
                      {formatTokens(totalTokens)} tokens • ${totalCost.toFixed(4)}
                    </p>
                  </>
                )}
              </div>
           </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Export Conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                <button
                  onClick={exportAsMarkdown}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                  <span>📝</span>
                  <span>Markdown</span>
                </button>
                <button
                  onClick={exportAsJSON}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                  <span>📄</span>
                  <span>JSON</span>
                </button>
                <button
                  onClick={exportAsPlainText}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                  <span>📃</span>
                  <span>Plain Text</span>
                </button>
              </div>
            )}
          </div>

          <button
          onClick={() => {
            if (confirm(`Delete conversation "${conversation.title}"?`)) {
              dispatch({
                type: "DELETE_CONVERSATION",
                payload: { spaceId, conversationId: convId },
              });
              router.push(`/space/${spaceId}`);
            }
          }}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
          </svg>
        </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {conversation.messages.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center opacity-50">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">Start the conversation</p>
           </div>
        ) : (
          conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none"
                    : msg.isSummary
                      ? "bg-amber-50 border border-amber-200 text-slate-800 rounded-bl-none ring-4 ring-amber-50/50"
                      : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                }`}
              >
                {msg.isSummary && (
                  <div className="mb-3 pb-2 border-b border-amber-200/50 flex items-center gap-2">
                     <span className="text-xl">📝</span>
                     <span className="font-bold text-amber-800 text-xs uppercase tracking-wider">Discussion Summary</span>
                  </div>
                )}
                {msg.role === "agent" && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100/50">
                    <AvatarDisplay
                      agent={{
                        id: msg.agentId || "",
                        name: msg.agentName || "Agent",
                        avatar: state.agents.find(a => a.id === msg.agentId)?.avatar
                      }}
                      size="sm"
                    />
                    <div className="flex items-baseline gap-2">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                         {msg.agentName}
                       </span>
                       {state.agents.find(a => a.id === msg.agentId)?.persona && (
                          <span className="text-[12px] text-slate-400 font-medium">
                            {state.agents.find(a => a.id === msg.agentId)?.persona}
                          </span>
                       )}
                    </div>
                  </div>
                )}

                <div className={`prose prose-sm ${msg.role === "user" ? "prose-invert" : "prose-slate"} max-w-none leading-relaxed overflow-x-auto`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        {isThinking && (
           <div className="flex justify-start animate-slide-up">
              <ThinkingIndicator />
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative">
          {/* Autocomplete Dropdown */}
          {showMentionDropdown && (() => {
            const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
            const spaceAgents = conversation.participantIds
              ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
              : allSpaceAgents;
            const filteredAgents = spaceAgents.filter(agent =>
              agent.name.toLowerCase().includes(mentionSearch.toLowerCase())
            );

            return filteredAgents.length > 0 ? (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredAgents.map((agent, index) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      const cursorPos = inputRef.current?.selectionStart || 0;
                      const textBeforeCursor = newMessage.slice(0, cursorPos);
                      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                      const textAfterCursor = newMessage.slice(cursorPos);
                      const newText = newMessage.slice(0, lastAtIndex) + `@${agent.name} ` + textAfterCursor;
                      setNewMessage(newText);
                      setShowMentionDropdown(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center gap-3 ${
                      index === selectedMentionIndex ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <AvatarDisplay
                      agent={agent}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">@{agent.name}</div>
                      {agent.persona && (
                        <div className="text-xs text-slate-500 truncate">{agent.persona}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef as any}
            value={newMessage}
            onChange={(e) => {
              const value = e.target.value;
              setNewMessage(value);

              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';

              // Detect @ mentions
              const cursorPos = e.target.selectionStart || 0;
              const textBeforeCursor = value.slice(0, cursorPos);
              const lastAtIndex = textBeforeCursor.lastIndexOf('@');

              if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
                // Just typed @
                setShowMentionDropdown(true);
                setMentionSearch('');
                setSelectedMentionIndex(0);
              } else if (lastAtIndex !== -1) {
                // Typing after @
                const searchText = textBeforeCursor.slice(lastAtIndex + 1);
                if (/^\w*$/.test(searchText)) {
                  setShowMentionDropdown(true);
                  setMentionSearch(searchText);
                  setSelectedMentionIndex(0);
                } else {
                  setShowMentionDropdown(false);
                }
              } else {
                setShowMentionDropdown(false);
              }
            }}
            placeholder="Type your message... (use @ to mention agents)"
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder:text-slate-400 font-medium transition-all shadow-inner outline-none resize-none min-h-[52px]"
            rows={1}
            onKeyDown={(e) => {
              if (showMentionDropdown) {
                const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
                const spaceAgents = conversation.participantIds
                  ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
                  : allSpaceAgents;
                const filteredAgents = spaceAgents.filter(agent =>
                  agent.name.toLowerCase().includes(mentionSearch.toLowerCase())
                );

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedMentionIndex((prev) =>
                    prev < filteredAgents.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedMentionIndex((prev) => prev > 0 ? prev - 1 : 0);
                } else if (e.key === 'Enter' && filteredAgents.length > 0) {
                  e.preventDefault();
                  const selectedAgent = filteredAgents[selectedMentionIndex];
                  const cursorPos = (inputRef.current as any)?.selectionStart || 0;
                  const textBeforeCursor = newMessage.slice(0, cursorPos);
                  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                  const textAfterCursor = newMessage.slice(cursorPos);
                  const newText = newMessage.slice(0, lastAtIndex) + `@${selectedAgent.name} ` + textAfterCursor;
                  setNewMessage(newText);
                  setShowMentionDropdown(false);
                  return;
                } else if (e.key === 'Escape') {
                  setShowMentionDropdown(false);
                  return;
                }
              }

              if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
                e.preventDefault();
                handleSend();
                // Reset height
                if (e.currentTarget) {
                    e.currentTarget.style.height = 'auto';
                }
              } else if (e.key === 'Enter' && showMentionDropdown) {
                  // Handled above
              } else if (!showMentionDropdown) {
                 // Allow newline
              } else {
                 setShowMentionDropdown(false);
              }
            }}
            disabled={isTyping || isAutoMode}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isTyping || isAutoMode}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center"
            title="Send Message"
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>

          {/* Auto Mode Button */}
          <div className="relative">
            <button
               onClick={() => setIsAutoModalOpen(true)}
               disabled={isTyping || isAutoMode}
               className={`h-full px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-all flex items-center gap-2 font-medium ${isAutoMode ? "animate-pulse" : ""}`}
               title="Start Auto Discussion"
             >
              {isAutoMode ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Discussing...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                  </svg>
                  <span>Auto</span>
                </>
              )}
            </button>


           </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
            AI agents can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      <AutoModeModal
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        onStart={startAutoMode}
        initialTopic={newMessage}
      />
    </div>
  );
}

// Helper to count agents
function spaceAgentsCount(state: any, space: any, conversation: any) {
  const allSpaceAgents = state.agents.filter((a: any) => (space.agentIds || []).includes(a.id));
  if (conversation.participantIds) {
    return allSpaceAgents.filter((a: any) => conversation.participantIds.includes(a.id)).length;
  }
  return allSpaceAgents.length;
}
