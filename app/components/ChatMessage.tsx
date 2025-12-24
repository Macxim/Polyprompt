"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Message, Agent } from "../types";
import AvatarDisplay from "./AvatarDisplay";
import { useApp } from "../state/AppProvider";

type ChatMessageProps = {
  msg: Message;
  agents: Agent[];
};

export default function ChatMessage({ msg, agents }: ChatMessageProps) {
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
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100/50">
            <AvatarDisplay
              agent={{
                id: msg.agentId || "",
                name: msg.agentName || "Agent",
                avatar: agentInfo?.avatar
              }}
              size="sm"
            />
            <div className="flex items-baseline gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                 {msg.agentName}
               </span>
               {agentInfo?.persona && (
                  <span className="text-[12px] text-slate-400 font-medium">
                    {agentInfo.persona}
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
  );
}
