"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { Message } from "../../../../types";
import ReactMarkdown from "react-markdown";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import ThinkingIndicator from "@/app/components/ThinkingIndicator";
import AutoModeModal from "@/app/components/AutoModeModal";
import ChatMessage from "@/app/components/ChatMessage";

export default function ConversationPage() {
  const { state, dispatch } = useApp();
  const params = useParams();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isAutoPrimed, setIsAutoPrimed] = useState(false);
  const [autoModeType, setAutoModeType] = useState<'quick' | 'deep'>('deep');
  const [isSharing, setIsSharing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const stopRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Consolidate scroll effects and optimize for performance/stability
  useEffect(() => {
    if (!showScrollButton) {
      const behavior = isTyping || isAutoMode ? "auto" : "smooth";
      messagesEndRef.current?.scrollIntoView({ behavior });
      setHasNewMessages(false);
    } else if (conversation?.messages) {
      setHasNewMessages(prev => (prev !== true ? true : prev));
    }
  }, [conversation?.messages, isTyping, isAutoMode, showScrollButton]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessages(false);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(prev => (prev !== !isAtBottom ? !isAtBottom : prev));
    if (isAtBottom) {
      setHasNewMessages(prev => (prev !== false ? false : prev));
    }
  };

  // Handle pre-filled prompt and auto-prime from template
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const auto = searchParams.get('auto');

    if (prompt) {
      setNewMessage(prompt);
    }

    if (auto === 'true') {
      setIsAutoPrimed(true);
    }

    if (prompt || auto === 'true') {
      // Clean URL parameters
      const params = new URLSearchParams(window.location.search);
      params.delete('prompt');
      params.delete('auto');
      const queryString = params.toString();
      const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Auto-focus input
    inputRef.current?.focus();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open Auto-Mode Modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAutoModalOpen(prev => !prev);
      }

      // Esc: Close menus or modals
      if (e.key === 'Escape') {
        setShowExportMenu(false);
        setShowMentionDropdown(false);
        setIsAutoModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


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
    const messageContent = newMessage.trim();
    if (!messageContent) return;

    setNewMessage(""); // Clear immediately for better UX
    // Reset height
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }

    const userMessage: Message = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      role: "user",
      content: messageContent,
      agentName: "User",
      timestamp: Date.now(),
    };

    // 1. Add user message
    dispatch({
      type: "ADD_MESSAGE",
      payload: { spaceId, conversationId: convId, message: userMessage },
    });

    // 2. Identify agents to invoke
    const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
    const spaceAgents = conversation.participantIds
      ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
      : allSpaceAgents;

    // Filter agents: if mentions exist (case-insensitive check for @Name), only invoke those; otherwise invoke all participants
    // We sort by name length descending to ensure @Technical Expert matches before @Technical
    const agentsToInvokeByMention = allSpaceAgents
      .sort((a, b) => b.name.length - a.name.length)
      .filter(agent => messageContent.toLowerCase().includes(`@${agent.name.toLowerCase()}`));

    const hasMentions = agentsToInvokeByMention.length > 0;

    // If auto-mode is primed, initiate auto-discussion instead of normal message
    // BUT only if no specific agents are mentioned
    if (isAutoPrimed && !isAutoMode && !hasMentions) {
      setIsAutoPrimed(false);
      handleAutoDiscuss(autoModeType, messageContent, false);
      return;
    }

    // If we have mentions but were primed, clear the prime state as the user is taking manual control
    if (isAutoPrimed && hasMentions) {
       setIsAutoPrimed(false);
    }

    setIsTyping(true);

    if (allSpaceAgents.length === 0) {
      setIsTyping(false);
      dispatch({
        type: "SET_BANNER",
        payload: { message: "No agents available in this space.", type: "error" },
      });
      return;
    }

    const agentsToInvoke = hasMentions ? agentsToInvokeByMention : spaceAgents;

    if (agentsToInvoke.length === 0 && hasMentions) {
      setIsTyping(false);
      dispatch({
        type: "SET_BANNER",
        payload: { message: "No matching agents found for your @mentions.", type: "error" },
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

        setIsThinking(true);

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

        setIsThinking(false);

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
            : "Failed to get response. Please try again.",
          type: "error"
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

  const handleAutoDiscuss = async (mode: 'quick' | 'deep', explicitTopic?: string, skipUserMessage = false) => {
    const topic = explicitTopic || newMessage.trim();

    if (!topic) {
      dispatch({ type: "SET_BANNER", payload: { message: "Please enter a topic first.", type: "error" } });
      return;
    }

    const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
    const spaceAgents = conversation.participantIds
      ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
      : allSpaceAgents;
    if (spaceAgents.length < 2) {
       dispatch({ type: "SET_BANNER", payload: { message: "Auto-mode requires at least 2 agents in the space.", type: "error" } });
       return;
    }

    setIsAutoMode(true);
    setIsTyping(true);
    stopRef.current = false;

    try {
      // 1. Send User Prompt (ONLY if not skipping)
      let userMessageContent = topic;

      if (!skipUserMessage) {
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
      }

      // 2. Call Planner API
      // Create a temporary loading indicator
      dispatch({ type: "SET_BANNER", payload: { message: "Planning discussion...", type: "success" } });

      // Clear input and modal
      setNewMessage("");
      setIsAutoModalOpen(false);

      setIsThinking(true);

      const planRes = await fetch("/api/auto-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessageContent,
          agents: spaceAgents.map(a => ({ id: a.id, name: a.name, persona: a.persona })),
          mode
        }),
      });

      if (!planRes.ok) throw new Error("Failed to plan discussion");
      const { plan: generatedPlan } = await planRes.json();

      if (!generatedPlan || generatedPlan.length === 0) {
        throw new Error("No plan generated");
      }

      // Client-side fix: Ensure only one summary step exists (the last one)
      const discussionSteps = generatedPlan.filter((s: any) => s.type !== 'summary');
      const summarySteps = generatedPlan.filter((s: any) => s.type === 'summary');

      const plan = [...discussionSteps];
      // Append only the last summary found (if any)
      if (summarySteps.length > 0) {
        plan.push(summarySteps[summarySteps.length - 1]);
      }

      dispatch({ type: "SET_BANNER", payload: { message: `Auto-discussion started: ${plan.length} turns planned.`, type: "success" } });
      setIsThinking(false);

      // 3. Execute the Plan
      // We need to track history locally because react state won't update fast enough in this loop?
      // Actually, we can just re-read `conversation.messages` if we were using a ref, but `conversation` is a prop/derived state.
      // So let's build a local `history` array starting with current messages
      // If we skipped adding the user message, IT IS ALREADY IN conversation.messages (at the end).
      // If we added it, `conversation.messages` MIGHT NOT have it yet (async update).
      // Wait, if we use dispatch, it's async in React 18 batching.

      // SAFE APPROACH: rebuilding history from what we know.
      let history = [...conversation.messages];
      if (!skipUserMessage) {
        // If we just added it, we must append it manually to our local history copy
        // Re-create the object since we can't access `userMessage` from the previous scope easily without refactoring
        const userMsgObj: Message = {
          id: "temp-id", // ID doesn't matter much for history context
          role: "user",
          content: topic,
          agentName: "User",
          timestamp: Date.now(),
        };
        history.push(userMsgObj);
      }

      // Safety Limit: Max 20 turns
      const SAFE_PLAN = (plan?.length || 0) > 20 ? plan.slice(0, 20) : plan;

      for (const step of SAFE_PLAN) {
        if (stopRef.current) {
             break;
        }

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

        // Create new abort controller for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsThinking(true);

        try {
          // Call Chat API with specific instruction
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              messages: [{ role: "system", content: `Instruction for this turn: ${step.instruction}` }, ...history],
              agent: {
                name: agent.name,
                persona: agent.persona,
                model: agent.model || "gpt-4o-mini",
                temperature: agent.temperature ?? 0.7,
              },
              conversationHistory: history,
            }),
          });

          if (!res.ok || !res.body) throw new Error("Chat API failed");

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let streamedContent = "";
          let tokenUsage = null;

          setIsThinking(false);

          while (true) {
            // Check for stop signal mid-stream
            if (stopRef.current) {
              controller.abort();
              break;
            }

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

        } catch (err: any) {
          if (err.name === 'AbortError' || stopRef.current) {
            // User stopped manually, just break loop
            // Finalize partial message
            dispatch({
              type: "UPDATE_MESSAGE",
              payload: { spaceId, conversationId: convId, messageId: agentMsgId, content: messageForHistory.content },
            });
            break;
          }
          throw err;
        } finally {
          abortControllerRef.current = null;
        }

        // Small delay between turns
        if (!step.type || step.type !== 'summary') {
           setIsThinking(true);
           // Wait, but check stopRef regularly
           for (let i=0; i<8; i++) {
             if (stopRef.current) break;
             await new Promise(resolve => setTimeout(resolve, 100));
           }
           setIsThinking(false);
        }
      }

      const endMsg = stopRef.current ? "Auto-mode stopped by user." : "Auto-discussion complete.";
      dispatch({ type: "SET_BANNER", payload: { message: endMsg, type: "success" } });

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Auto-discuss error:", error);
        dispatch({ type: "SET_BANNER", payload: { message: "Auto-discuss failed. " + error.message, type: "error" } });
      }
    } finally {
      setIsAutoMode(false);
      setIsTyping(false);
      stopRef.current = false;
      if (abortControllerRef.current) {
         abortControllerRef.current.abort();
         abortControllerRef.current = null;
      }
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

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    dispatch({ type: "SET_BANNER", payload: { message: "Generating public link...", type: "success" } });

    try {
        // Collect agents relevant to this conversation for de-normalization
        const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
        const spaceAgents = conversation.participantIds
          ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
          : allSpaceAgents;

        const res = await fetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                conversation,
                agents: spaceAgents // Send agents so they are saved in the snapshot
            }),
        });

        if (!res.ok) throw new Error("Share failed");

        const { shareId } = await res.json();
        const url = `${window.location.origin}/share/${shareId}`;

        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
        dispatch({ type: "SET_BANNER", payload: { message: "Link copied to clipboard!", type: "success" } });
    } catch (e: any) {
        console.error("Share error", e);
        dispatch({ type: "SET_BANNER", payload: { message: "Failed to share: " + (e.message || "Unknown error"), type: "error" } });
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
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

        <div className="flex items-center gap-1.5">
          {/* Share Button */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium text-sm ${
              shareCopied
                ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            {isSharing ? (
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : shareCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-in zoom-in duration-200">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M15.75 4.5a3 3 0 1 1 .825 2.066l-8.421 4.679a3.002 3.002 0 0 1 0 1.51l8.421 4.679a3 3 0 1 1-.729 1.31l-8.421-4.678a3 3 0 1 1 0-4.132l8.421-4.679a3 3 0 0 1-.096-.755Z" clipRule="evenodd" />
              </svg>
            )}
            <span>{shareCopied ? "Copied" : "Share"}</span>
          </button>
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 font-medium text-sm ${showExportMenu ? 'bg-indigo-50 text-indigo-600' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              <span>Export</span>
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
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth ${conversation.messages.length === 0 ? 'flex flex-col items-center justify-center' : ''}`}>
        {conversation.messages.length === 0 ? (
          <div className="max-w-md w-full glass-panel bg-white/40 border border-slate-200/60 rounded-3xl p-8 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">How agent responses work:</h3>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 group">
                <div className="mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 "><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd"></path></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm  flex items-center gap-2">
                    Auto Mode ON
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  </p>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Agents discuss with each other
                  </p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 "><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd"></path></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm ">
                    Auto Mode OFF
                  </p>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    All active agents reply in sequence
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200/50">
                <div className="flex gap-4 group">
                  <div className="mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-indigo-50">
                    💬
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[13px] mb-1">Want specific agents only?</p>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Use <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-xs">@mentions</span> in your message
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          conversation.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              agents={state.agents}
            />
          ))
        )}
        {isThinking && (
          <div className="flex justify-start animate-slide-up">
            <ThinkingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className={`fixed bottom-32 right-8 z-20 flex items-center transition-all duration-500 shadow-2xl animate-bounce-subtle overflow-hidden
              ${hasNewMessages
                ? "bg-indigo-600 text-white rounded-full pl-4 pr-5 py-2.5 gap-2"
                : "bg-white/90 backdrop-blur-md text-indigo-600 rounded-full p-3 border border-indigo-100 hover:bg-white"
              } hover:scale-110 active:scale-95 group font-semibold text-sm h-12`}
          >
            {hasNewMessages ? (
              <>
                <span className="whitespace-nowrap tracking-tight">New Messages</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v16.19l6.22-6.22a.75.75 0 1 1 1.06 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 1 1 1.06-1.06l6.22 6.22V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                </svg>
              </>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v16.19l6.22-6.22a.75.75 0 1 1 1.06 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 1 1 1.06-1.06l6.22 6.22V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </main>

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

          <div className="relative rounded-3xl bg-slate-100 border border-transparent focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent focus-within:bg-white transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);

                // Auto-resize
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                  inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
                }

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
            className="w-full bg-transparent border-none rounded-3xl px-4 py-3.5 pr-32 focus:ring-0 text-slate-800 placeholder:text-slate-400 font-medium outline-none resize-none min-h-[52px]"
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
                } else if ((e.key === 'Enter' || e.key === 'Tab') && filteredAgents.length > 0) {
                  e.preventDefault();
                  const selectedAgent = filteredAgents[selectedMentionIndex];
                  const cursorPos = inputRef.current?.selectionStart || 0;
                  const textBeforeCursor = newMessage.slice(0, cursorPos);
                  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                  const textAfterCursor = newMessage.slice(cursorPos);
                  const newText = newMessage.slice(0, lastAtIndex) + `@${selectedAgent.name} ` + textAfterCursor;
                  setNewMessage(newText);
                  setShowMentionDropdown(false);

                  // Keep focus and reset selection to end of inserted name
                  setTimeout(() => {
                    if (inputRef.current) {
                      const newPos = lastAtIndex + selectedAgent.name.length + 2; // +1 for @, +1 for space
                      inputRef.current.setSelectionRange(newPos, newPos);
                      inputRef.current.focus();
                    }
                  }, 0);
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
                if (inputRef.current) {
                    inputRef.current.style.height = 'auto';
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

          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Auto Mode Button */}
             <button
                onClick={() => {
                    if (isAutoMode) {
                        stopRef.current = true;
                        if (abortControllerRef.current) abortControllerRef.current.abort();
                    } else if (isAutoPrimed) {
                        setIsAutoPrimed(false);
                    } else {
                        setIsAutoModalOpen(true);
                    }
                }}
                disabled={isTyping && !isAutoMode}
                className={`p-2 rounded-full flex items-center justify-center gap-2 font-bold min-w-[120px] px-4 py-2 transition-all relative overflow-hidden group/auto ${
                  isAutoMode
                    ? "bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600"
                    : isAutoPrimed
                      ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] animate-pulse-gentle"
                      : "text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50"
                }`}
                title={isAutoMode ? "Stop Auto Mode" : isAutoPrimed ? "Auto-Mode Primed (Click to disable)" : "Start Auto Discussion"}
              >
               {isAutoMode ? (
                <>
                  <svg className="h-5 w-5 text-white animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
                  </svg>
                  <span className="uppercase tracking-wider text-xs">Stop Auto</span>
                </>
               ) : (
                <>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 transition-transform duration-500`}>
                   <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.036a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                 </svg>
                 <span className="uppercase tracking-wider text-xs">{isAutoPrimed ? "Discuss" : "Auto"}</span>
                 {isAutoPrimed && (
                   <span className="absolute -top-1 -right-0 bg-amber-400 text-indigo-900 text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter leading-none shadow-sm">
                     {autoModeType}
                   </span>
                 )}
                </>
               )}
             </button>

            {/* Send Button */}
            <button
               onClick={handleSend}
               disabled={!newMessage.trim() || isTyping || isAutoMode}
               className={`${
                 isAutoPrimed
                   ? "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200"
                   : "bg-indigo-600 hover:bg-indigo-700"
                } disabled:opacity-30 disabled:cursor-not-allowed text-white p-2 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-md`}
               title={isAutoPrimed ? "Send and Start Discussion" : "Send Message"}
             >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                 <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
               </svg>
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
