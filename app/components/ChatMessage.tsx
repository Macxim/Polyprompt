"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Message, Agent } from "../types";
import AvatarDisplay from "./AvatarDisplay";
import ThinkingIndicator from "./ThinkingIndicator";
import { useApp } from "../state/AppProvider";

import StanceBadge from "./StanceBadge";

type ChatMessageProps = {
  msg: Message;
  agents: Agent[];
  allMessages?: Message[];
};

// Memoize ChatMessage to avoid expensive re-renders on every streaming chunk
const ChatMessage = React.memo(({ msg, agents, allMessages = [] }: ChatMessageProps) => {
  const { dispatch } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    dispatch({ type: "SET_BANNER", payload: { message: "Copied to clipboard!", type: "success" } });

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const agentInfo = msg.role === "agent" ? agents.find(a => a.id === msg.agentId) : null;
  const respondingTo = msg.respondingToId ? allMessages.find(m => m.id === msg.respondingToId) : null;
  const respondingToName = respondingTo?.agentName || (respondingTo?.role === 'user' ? 'User' : null);

  return (
    <div
      className={`flex w-full group ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm relative ${
          msg.role === "user"
            ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none"
            : msg.isSummary
              ? "bg-amber-50 border border-amber-200 text-slate-800 rounded-bl-none ring-4 ring-amber-50/50"
              : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
        }`}
      >
        {/* Copy Button (on hover) or checkmark if copied */}
        <button
          onClick={handleCopy}
          className={`absolute top-0 ${msg.role === "user" ? "right-full mr-2" : "left-full ml-2"} p-1.5 rounded-lg bg-white border border-slate-200 ${copied ? "text-green-600 border-green-200" : "text-slate-400 hover:text-indigo-600 hover:border-indigo-200"} shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10`}
          title={copied ? "Copied!" : "Copy to Clipboard"}
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 animate-in zoom-in duration-200">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          )}
        </button>

        {msg.isSummary && (
          <div className="mb-3 pb-2 border-b border-amber-200/50 flex items-center gap-2">
             <span className="text-xl">📝</span>
             <span className="font-bold text-amber-800 text-xs uppercase tracking-wider">Discussion Summary</span>
          </div>
        )}

        {msg.role === "agent" && (
          <div className="flex items-start gap-3 mb-2 pb-2 border-b border-slate-100/50">
            <AvatarDisplay
              agent={{
                id: msg.agentId || "",
                name: msg.agentName || "Agent",
                avatar: agentInfo?.avatar
              }}
              size="md"
              className="mt-0.5"
            />
            <div className="flex flex-col min-w-0 flex-1">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                   {msg.agentName}
                 </span>
                 <StanceBadge stance={msg.stance} round={msg.round} phase={msg.phase} />
               </div>

               {msg.respondingToId && respondingToName && (
                 <div className="text-[10px] text-indigo-500/70 font-bold mb-1 flex items-center gap-1">
                   <span className="opacity-50">↳</span>
                   Responding to {respondingToName}
                 </div>
               )}

               {agentInfo?.persona && (
                  <span className="text-[12px] text-slate-400 font-medium leading-tight">
                    {agentInfo.persona}
                  </span>
               )}
            </div>
          </div>
        )}

        <div className={`prose ${msg.role === "user" ? "prose-invert" : "prose-slate"} max-w-none leading-loose overflow-x-auto text-[15px]`}>
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');

                if (!inline && language) {
                  return <CodeBlock code={codeString} language={language} />;
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              p({ children }: any) {
                return <p className="mb-4 last:mb-0 leading-7">{children}</p>;
              },
              ul({ children }: any) {
                return <ul className="my-4 space-y-2 list-disc pl-5">{children}</ul>;
              },
              ol({ children }: any) {
                return <ol className="my-4 space-y-2 list-decimal pl-5">{children}</ol>;
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>

        {/* Thinking Indicator for streaming empty messages */}
        {msg.role === "agent" && !msg.content && msg.isStreaming && (
           <ThinkingIndicator mode="bubble" />
        )}
      </div>
    </div>
  );
});

export default ChatMessage;

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-slate-700/50 bg-[#0d1117] group/code shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider ${
            copied ? "text-emerald-400 bg-emerald-400/10" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto custom-scrollbar">
        <code className={`language-${language} text-indigo-100/90 text-[13px] leading-relaxed font-mono block whitespace-pre`}>
          {code}
        </code>
      </div>
    </div>
  );
}
