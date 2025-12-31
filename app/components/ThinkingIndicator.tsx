type ThinkingIndicatorProps = {
  mode?: "default" | "bubble";
};

export default function ThinkingIndicator({ mode = "default" }: ThinkingIndicatorProps) {
  if (mode === "bubble") {
    return (
      <div className="flex items-center gap-2 py-1 px-1">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
        </div>
        <span className="text-xs font-medium text-slate-400 animate-pulse">Thinking...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white/50 border border-slate-100 rounded-xl shadow-sm w-fit animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm font-medium text-slate-500">Thinking...</span>
    </div>
  );
}
