"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/app/state/AppProvider";
import { Message } from "../../../../types";
import ReactMarkdown from "react-markdown";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import ThinkingIndicator from "@/app/components/ThinkingIndicator";
import ChatMessage from "@/app/components/ChatMessage";
import {
  Key,
  Send,
  Sparkles,
  Share2,
  Download,
  Trash2,
  ArrowDown,
  ArrowLeft,
  Check,
  Loader2,
  ChevronDown,
  FileText,
  FileJson,
  Type,
  Square
} from "lucide-react";

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
  const [isSharing, setIsSharing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true); // Default to true to avoid flash
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
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
      const behavior = isTyping || isDebating ? "auto" : "smooth";
      messagesEndRef.current?.scrollIntoView({ behavior });
      // Only set to false if it's currently true to avoid redundant updates
      setHasNewMessages(prev => {
        if (prev !== false) return false;
        return prev;
      });
    } else if (conversation?.messages) {
      // Only set to true if it's currently false
      setHasNewMessages(prev => {
        if (prev !== true) return true;
        return prev;
      });
    }
  }, [conversation?.messages?.length, isTyping, isDebating, showScrollButton]);

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

  // Handle pre-filled prompt from template
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const auto = searchParams.get('auto') === 'true';

    if (prompt) {
      if (auto) {
        handleAutoDiscuss(prompt);
      } else {
        setNewMessage(prompt);
      }

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

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
        setRemainingMessages(data.remainingMessages);
      }
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }, []);

  // Check if user has an API key
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: Close menus
      if (e.key === 'Escape') {
        setShowExportMenu(false);
        setShowMentionDropdown(false);
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

  // Get conversation agents
  const allSpaceAgents = state.agents.filter((a) => (space.agentIds || []).includes(a.id));
  const conversationAgents = conversation.participantIds
    ? allSpaceAgents.filter(a => conversation.participantIds!.includes(a.id))
    : allSpaceAgents;
  const conversationAgentsCount = conversationAgents.length;

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
    const agentsToInvokeByMention = allSpaceAgents
      .sort((a, b) => b.name.length - a.name.length)
      .filter(agent => messageContent.toLowerCase().includes(`@${agent.name.toLowerCase()}`));

    const hasMentions = agentsToInvokeByMention.length > 0;

    // If auto mode is enabled, initiate auto-discussion instead of normal message
    if (isDebating && !hasMentions && spaceAgents.length >= 2) {
      handleAutoDiscuss(messageContent, true); // true to skip re-adding user message
      return;
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

    // PIVOT: In the new Pure Debate platform, 2+ agents always results in a debate.
    if (!hasMentions && agentsToInvoke.length >= 2) {
      handleAutoDiscuss(messageContent, true);
      return;
    }
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

        dispatch({
          type: "ADD_MESSAGE",
          payload: { spaceId, conversationId: convId, message: initialAgentMessage },
        });

        setIsThinking(true);

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
            countAsUserMessage: agentsToInvoke.indexOf(agent) === 0,
          }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            const data = await res.json();
            setRemainingMessages(0);
            throw new Error(data.message || "Daily limit reached");
          }
          if (res.status === 403) {
             const errorData = await res.json();
             throw new Error(errorData.message || "API Key Required");
          }
          throw new Error(`API error: ${res.status}`);
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = "";
        let tokenUsage = null;

        setIsThinking(false);

        while (true) {
          const { done, value} = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

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

          if (streamedContent.length % 5 === 0 || streamedContent.endsWith('.') || streamedContent.endsWith('\n')) {
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
        }

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

        if (spaceAgents.indexOf(agent) < spaceAgents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error.message.includes("Daily Limit Reached")) {
        setRemainingMessages(0);
      }
      dispatch({
        type: "SET_BANNER",
        payload: {
          message: error.message.includes("Daily Limit Reached")
            ? error.message
            : error.message === "API error: 401"
              ? "Invalid API key. Please check your settings."
              : "Failed to get response. Please try again.",
          type: "error"
        },
      });
    } finally {
      setIsTyping(false);
      checkStatus();
    }
  };

  const handleAutoDiscuss = async (explicitTopic?: string, skipUserMessage = false) => {
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
       dispatch({ type: "SET_BANNER", payload: { message: "Debate mode requires at least 2 agents in the space.", type: "error" } });
       return;
    }

    setIsDebating(true);
    setIsTyping(true);
    stopRef.current = false;

    try {
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

      setIsThinking(true);

      const planRes = await fetch("/api/debate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: topic,
          agents: spaceAgents.map(a => ({ id: a.id, name: a.name, persona: a.persona })),
          mode: 'deep', // Default to deep for better debates
          discussionMode: 'debate'
        }),
      });

      if (!planRes.ok) throw new Error("Failed to plan debate");

      const { plan, options } = await planRes.json();
      if (!plan || plan.length === 0) throw new Error("No plan generated");

      setIsThinking(false);

      const stepToMessageId: Record<number, string> = {};
      let history = [...conversation.messages];
      if (!skipUserMessage) {
        history.push({ id: "temp", role: "user", content: topic, agentName: "User", timestamp: Date.now() });
      }

      let previousAgentStance: string | undefined = undefined;
      let previousAgentName: string | undefined = undefined;
      let skipToSummary = false;

      for (const step of plan) {
        if (stopRef.current) break;

        // Early Termination Check: If arguments are repeating too much (Round 3+)
        if (!skipToSummary && step.round && step.round >= 3 && step.type !== 'summary') {
          const recentResponses = history.slice(-4).filter(m => m.role === 'agent').map(m => m.content.toLowerCase());
          if (recentResponses.length >= 2) {
            const words = recentResponses.join(' ').split(/\s+/).filter(w => w.length > 4);
            const uniqueWords = new Set(words);
            const uniquenessRatio = uniqueWords.size / words.length;
            if (uniquenessRatio < 0.35) {
              console.log("Ending debate early: arguments exhausted/repetitive", uniquenessRatio);
              skipToSummary = true;
            }
          }
        }

        if (skipToSummary && step.type !== 'summary') continue;

        const agent = spaceAgents.find(a => a.id === step.agentId) || spaceAgents[0];
        scrollToBottom();

        const agentMsgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const respondingToId = step.respondingToStepIndex !== undefined ? stepToMessageId[step.respondingToStepIndex] : undefined;
        stepToMessageId[plan.indexOf(step)] = agentMsgId;

        const initialAgentMessage: Message = {
          id: agentMsgId,
          role: "agent",
          content: "",
          agentId: agent.id,
          agentName: agent.name,
          timestamp: Date.now(),
          isStreaming: true,
          isSummary: step.type === 'summary',
          respondingToId,
          round: step.round,
          phase: step.phase,
          stance: step.targetPosition || (step.type === 'summary' ? 'summary' : undefined)
        };

        dispatch({
          type: "ADD_MESSAGE",
          payload: { spaceId, conversationId: convId, message: initialAgentMessage },
        });

        let attempts = 0;
        let success = false;
        let finalStreamedContent = "";
        let finalTokenUsage = null;

        while (attempts < 3 && !success) {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          setIsThinking(true);

          try {
            const stepIndex = plan.indexOf(step);
            let debateTurn: 'initial' | 'response' | 'counter' | 'summary' | undefined = undefined;

            if (step.type === 'summary') {
              debateTurn = 'summary';
            } else {
              if (stepIndex <= 1) debateTurn = 'initial';
              else if (stepIndex <= 3) debateTurn = 'response';
              else debateTurn = 'counter';
            }

            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                messages: [{ role: "system", content: `Debate Instruction: ${step.instruction}${attempts > 0 ? `\n\nRETRY ATTEMPT ${attempts}: You previously betrayed your position. You MUST defend ${step.targetPosition} aggressively now. DO NOT CONCEDE. KEEP UNDER 100 WORDS.` : ''}` }, ...history],
                agent: {
                  name: agent.name,
                  persona: agent.persona,
                  model: agent.model || "gpt-4o-mini",
                  temperature: step.type === 'summary' ? 0.3 : 0.85,
                  verbosity: agent.verbosity,
                },
                conversationHistory: history,
                debateTurn,
                targetPosition: step.targetPosition,
                options,
                round: step.round,
                phase: step.phase,
                previousAgentStance,
                previousAgentName
              }),
            });

            setIsThinking(false);
            if (!res.ok || !res.body) throw new Error("Debate turn failed");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let streamedContent = "";
            let tokenUsage = null;

            while (true) {
              if (stopRef.current) { controller.abort(); break; }
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });

              if (chunk.includes('__TOKENS__')) {
                const parts = chunk.split('__TOKENS__');
                streamedContent += parts[0];
                try { tokenUsage = JSON.parse(parts[1]); } catch (e) {}
              } else { streamedContent += chunk; }

              dispatch({
                type: "UPDATE_MESSAGE",
                payload: { spaceId, conversationId: convId, messageId: agentMsgId, content: streamedContent },
              });
            }

            // VALIDATION STEP
            if (step.type === 'summary') {
              setIsThinking(true);
              const valRes = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  debateTurn: 'validate-synthesis',
                  options,
                  messages: [{ role: "user", content: streamedContent }]
                })
              });
              setIsThinking(false);

              if (valRes.ok) {
                const validation = await valRes.json();
                if (validation.isValid || attempts >= 2) {
                  success = true;
                  finalStreamedContent = streamedContent;
                  finalTokenUsage = tokenUsage;
                } else {
                  console.warn(`Synthesis validation failed (Attempt ${attempts + 1}):`, validation.reason);
                  // Add a invisible "RETRY TIP" to history for the next attempt
                  history.push({
                    id: 'retry-tip',
                    role: 'user',
                    content: `RETRY TIP: ${validation.reason}. DO NOT pick a side. Focus on "Choose X if:" criteria only.`,
                    agentName: 'System',
                    timestamp: Date.now()
                  });
                  attempts++;
                }
              } else {
                success = true;
                finalStreamedContent = streamedContent;
                finalTokenUsage = tokenUsage;
              }
            } else if (step.targetPosition) {
              setIsThinking(true);
              const valRes = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  debateTurn: 'validate',
                  targetPosition: step.targetPosition,
                  options,
                  messages: [{ role: "user", content: streamedContent }]
                })
              });
              setIsThinking(false);

              if (valRes.ok) {
                const validation = await valRes.json();
                if (validation.isValid || attempts >= 2) {
                  success = true;
                  finalStreamedContent = streamedContent;
                  finalTokenUsage = tokenUsage;
                } else {
                  console.warn(`Validation failed for ${agent.name} (Attempt ${attempts + 1}):`, validation);
                  attempts++;
                }
              } else {
                // If validation API fails, assume success to avoid infinite loops
                success = true;
                finalStreamedContent = streamedContent;
                finalTokenUsage = tokenUsage;
              }
            } else {
              success = true;
              finalStreamedContent = streamedContent;
              finalTokenUsage = tokenUsage;
            }

          } catch (err: any) {
            if (err.name === 'AbortError' || stopRef.current) break;
            attempts++;
            if (attempts >= 3) throw err;
          } finally {
            abortControllerRef.current = null;
          }
        }

        // Finalize the message in history and state
        previousAgentStance = step.targetPosition || undefined;
        previousAgentName = agent.name;

        let stance = step.type === 'summary' ? 'summary' : step.targetPosition;

        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            spaceId,
            conversationId: convId,
            messageId: agentMsgId,
            content: finalStreamedContent,
            tokens: finalTokenUsage,
            stance,
            round: step.round,
            phase: step.phase
          },
        });

        history.push({ ...initialAgentMessage, content: finalStreamedContent, stance });

        if (plan.indexOf(step) < plan.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        dispatch({ type: "SET_BANNER", payload: { message: "Debate failed: " + error.message, type: "error" } });
      }
    } finally {
      setIsDebating(false);
      setIsTyping(false);
      stopRef.current = false;
      checkStatus();
    }
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
    let content = `# ${conversation.title}\n\nExported on ${new Date().toLocaleString()}\n\n---\n\n`;
    conversation.messages.forEach(msg => {
      const name = msg.role === 'user' ? 'User' : (msg.agentName || 'Agent');
      content += `**${name}**\n\n${msg.content}\n\n---\n\n`;
    });
    downloadFile(content, `${conversation.title.replace(/\s+/g, '-').toLowerCase()}.md`, 'text/markdown');
    setShowExportMenu(false);
  };

  const exportAsJSON = () => {
    const content = JSON.stringify(conversation.messages, null, 2);
    downloadFile(content, `${conversation.title.replace(/\s+/g, '-').toLowerCase()}.json`, 'application/json');
    setShowExportMenu(false);
  };

  const exportAsPlainText = () => {
    let content = `${conversation.title}\n\n`;
    conversation.messages.forEach(msg => {
      const name = msg.role === 'user' ? 'User' : (msg.agentName || 'Agent');
      content += `${name}:\n${msg.content}\n\n`;
    });
    downloadFile(content, `${conversation.title.replace(/\s+/g, '-').toLowerCase()}.txt`, 'text/plain');
    setShowExportMenu(false);
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
        const res = await fetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation, agents: conversationAgents }),
        });
        if (!res.ok) throw new Error("Share failed");
        const { shareId } = await res.json();
        const url = `${window.location.origin}/share/${shareId}`;
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
        dispatch({ type: "SET_BANNER", payload: { message: "Link copied!", type: "success" } });
    } catch (e: any) {
        dispatch({ type: "SET_BANNER", payload: { message: "Failed to share", type: "error" } });
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      {/* Header */}
      <div className="glass-panel sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-200/50 shadow-sm" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.push(`/space/${spaceId}`)} className="p-2 -ml-2 rounded-full hover:bg-slate-100/80 text-slate-500 transition-colors">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
             <input
               type="text"
               defaultValue={conversation.title}
               onBlur={(e) => {
                 const newTitle = e.target.value.trim();
                 if (newTitle && newTitle !== conversation.title) {
                   dispatch({ type: "RENAME_CONVERSATION", payload: { spaceId, conversationId: convId, newTitle } });
                 } else { e.target.value = conversation.title; }
               }}
               className="text-lg font-bold text-slate-800 leading-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors w-full sm:w-auto"
             />
             <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                <p className="text-slate-500 font-medium truncate">{conversationAgentsCount} Agents</p>
                {totalTokens > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <p className="text-slate-500 font-medium whitespace-nowrap">{formatTokens(totalTokens)} tokens</p>
                  </>
                )}
             </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5">
            <button onClick={handleShare} disabled={isSharing} className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium text-sm ${shareCopied ? "text-emerald-600 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"}`}>
              {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{shareCopied ? "Copied" : "Share"}</span>
            </button>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className={`px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 font-medium text-sm ${showExportMenu ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 overflow-hidden text-left">
                  <button onClick={exportAsMarkdown} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2"><FileText className="w-4 h-4" /> Markdown</button>
                  <button onClick={exportAsJSON} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2"><FileJson className="w-4 h-4" /> JSON</button>
                  <button onClick={exportAsPlainText} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2"><Type className="w-4 h-4" /> Plain Text</button>
                </div>
              )}
            </div>
            <button onClick={() => { if (confirm(`Delete conversation?`)) { dispatch({ type: "DELETE_CONVERSATION", payload: { spaceId, conversationId: convId } }); router.push(`/space/${spaceId}`); }}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="sm:hidden relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
               <ChevronDown className={`w-6 h-6 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-20 overflow-hidden">
                <button onClick={handleShare} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-3"><Share2 className="w-4 h-4" /> {shareCopied ? "Link Copied" : "Share Link"}</button>
                <div className="h-px bg-slate-100 mx-2 my-1" />
                <button onClick={exportAsMarkdown} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-3"><FileText className="w-4 h-4" /> Export Markdown</button>
                <button onClick={exportAsJSON} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-3"><FileJson className="w-4 h-4" /> Export JSON</button>
                <div className="h-px bg-slate-100 mx-2 my-1" />
                <button onClick={() => { if (confirm(`Delete conversation?`)) { dispatch({ type: "DELETE_CONVERSATION", payload: { spaceId, conversationId: convId } }); router.push(`/space/${spaceId}`); }}} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><Trash2 className="w-4 h-4" /> Delete Conversation</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <main ref={scrollContainerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth ${conversation.messages.length === 0 ? 'flex flex-col items-center justify-center' : ''}`}>
        {conversation.messages.length === 0 ? (
          <div className="max-w-md w-full glass-panel bg-white/40 border border-slate-200/60 rounded-3xl p-8 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-6">How agents respond:</h3>
            <div className="space-y-6">
              <div className="flex gap-4 group">
                <div className="mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Sparkles className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-2 text-indigo-600">Pure Debate Platform <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span></p>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">Agents challenge each other to expose the truth.</p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-200/50">
                <div className="flex gap-4 group">
                  <div className="mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">💬</div>
                  <div>
                    <p className="font-bold text-slate-800 text-[13px] mb-1">Target specific agents?</p>
                    <p className="text-slate-600 text-sm">Use <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-xs">@mentions</span> in your message</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          conversation.messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} agents={state.agents} allMessages={conversation.messages} />
          ))
        )}
        <div ref={messagesEndRef} />
        {showScrollButton && (
          <button onClick={scrollToBottom} className={`fixed bottom-32 right-8 z-20 flex items-center transition-all duration-500 shadow-2xl animate-bounce-subtle overflow-hidden ${hasNewMessages ? "bg-indigo-600 text-white rounded-full pl-4 pr-5 py-2.5 gap-2" : "bg-white/90 backdrop-blur-md text-indigo-600 rounded-full p-3 border border-indigo-100 hover:bg-white"} hover:scale-110 active:scale-95 group font-semibold text-sm h-12`}>
            {hasNewMessages ? <><span className="whitespace-nowrap tracking-tight">New messages</span><ArrowDown className="w-4 h-4" /></> : <ArrowDown className="w-6 h-6" />}
          </button>
        )}
      </main>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative mb-4">
          {remainingMessages !== null && (
            <div className="absolute bottom-full left-0 mb-3 pl-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full flex items-center gap-2 shadow-sm animate-in slide-in-from-bottom-1 duration-300">
              <div className={`w-1.5 h-1.5 rounded-full ${remainingMessages > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{remainingMessages === 0 ? "Daily limit reached" : `${remainingMessages} free messages left today`}</span>
              <button onClick={() => router.push('/settings')} className="text-xs py-1 pr-3 rounded-r-full font-bold text-indigo-600 border-l border-slate-200 pl-2">Go Unlimited</button>
            </div>
          )}
          {showMentionDropdown && (() => {
            const filteredAgents = conversationAgents.filter(agent => agent.name.toLowerCase().includes(mentionSearch.toLowerCase()));
            return filteredAgents.length > 0 ? (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30">
                {filteredAgents.map((agent, index) => (
                  <button key={agent.id} onClick={() => {
                    const cursorPos = inputRef.current?.selectionStart || 0;
                    const textBeforeCursor = newMessage.slice(0, cursorPos);
                    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                    const textAfterCursor = newMessage.slice(cursorPos);
                    setNewMessage(newMessage.slice(0, lastAtIndex) + `@${agent.name} ` + textAfterCursor);
                    setShowMentionDropdown(false);
                    inputRef.current?.focus();
                  }} className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center gap-3 ${index === selectedMentionIndex ? 'bg-indigo-50' : ''}`}>
                    <AvatarDisplay agent={agent} size="md" />
                    <div className="flex-1 overflow-hidden"><div className="font-medium text-slate-800 truncate">@{agent.name}</div></div>
                  </button>
                ))}
              </div>
            ) : null;
          })()}
        </div>

        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="relative rounded-3xl bg-slate-100 border border-transparent focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all shadow-sm ring-1 ring-slate-200/50">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);
                if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px'; }
                const cursorPos = e.target.selectionStart || 0;
                const textBeforeCursor = value.slice(0, cursorPos);
                const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) { setShowMentionDropdown(true); setMentionSearch(''); setSelectedMentionIndex(0); }
                else if (lastAtIndex !== -1) {
                  const searchText = textBeforeCursor.slice(lastAtIndex + 1);
                  if (/^\w*$/.test(searchText)) { setShowMentionDropdown(true); setMentionSearch(searchText); setSelectedMentionIndex(0); }
                  else setShowMentionDropdown(false);
                } else setShowMentionDropdown(false);
              }}
              onKeyDown={(e) => {
                if (showMentionDropdown) {
                  const filteredAgents = conversationAgents.filter(agent => agent.name.toLowerCase().includes(mentionSearch.toLowerCase()));
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedMentionIndex(p => p < filteredAgents.length - 1 ? p + 1 : p); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedMentionIndex(p => p > 0 ? p - 1 : 0); }
                  else if ((e.key === 'Enter' || e.key === 'Tab') && filteredAgents.length > 0) {
                    e.preventDefault();
                    const agent = filteredAgents[selectedMentionIndex];
                    const cursorPos = inputRef.current?.selectionStart || 0;
                    const lastAtIndex = newMessage.slice(0, cursorPos).lastIndexOf('@');
                    setNewMessage(newMessage.slice(0, lastAtIndex) + `@${agent.name} ` + newMessage.slice(cursorPos));
                    setShowMentionDropdown(false);
                  } else if (e.key === 'Escape') setShowMentionDropdown(false);
                } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Type your message..."
              disabled={isTyping || isDebating}
              className="w-full bg-transparent border-none rounded-3xl px-4 py-3.5 pr-[60px] focus:ring-0 text-slate-800 placeholder:text-slate-400 font-medium outline-none resize-none min-h-[52px]"
              rows={1}
            />
            <div className="absolute right-2 bottom-2">
              <div className="flex items-center gap-2">
                {isDebating && (
                  <button onClick={() => { stopRef.current = true; if (abortControllerRef.current) abortControllerRef.current.abort(); }} className="bg-red-500 self-center text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg hover:bg-red-600 transition-colors flex items-center gap-2 animate-in fade-in zoom-in">
                    <Square className="w-3 h-3 fill-white" /> Stop Debate
                  </button>
                )}
                <button onClick={handleSend} disabled={!newMessage.trim() || isTyping || isDebating} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:scale-95 text-white p-2 rounded-full transition-all flex items-center justify-center shadow-md">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400">AI agents can make mistakes. Please verify important information.</p>
        </div>
      </div>
    </div>
  );
}

function spaceAgentsCount(state: any, space: any, conversation: any) {
  const allSpaceAgents = state.agents.filter((a: any) => (space.agentIds || []).includes(a.id));
  if (conversation.participantIds) {
    return allSpaceAgents.filter((a: any) => conversation.participantIds.includes(a.id)).length;
  }
  return allSpaceAgents.length;
}
