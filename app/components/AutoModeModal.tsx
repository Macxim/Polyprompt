import { useState, useRef, useEffect } from "react";

interface AutoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (topic: string, mode: 'quick' | 'deep') => void;
  initialTopic?: string;
}

export default function AutoModeModal({ isOpen, onClose, onStart, initialTopic = "" }: AutoModeModalProps) {
  const [topic, setTopic] = useState(initialTopic);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTopic(initialTopic); // Updates the state if initialTopic changes while modal is closed
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Start Auto Discussion
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                What should the agents discuss?
              </label>
              <input
                ref={inputRef}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The future of AI in healthcare, Rust vs C++..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-800 placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topic.trim()) {
                    onStart(topic, 'quick');
                  } else if (e.key === "Escape") {
                    onClose();
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => topic.trim() && onStart(topic, 'quick')}
                disabled={!topic.trim()}
                className="group relative flex flex-col items-start p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white hover:border-indigo-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-2xl mb-2">⚡</span>
                <span className="font-bold text-slate-800">Quick Debate</span>
                <span className="text-xs text-slate-500 mt-1">Brief exchange to reach consensus quickly (~3-4 turns)</span>
              </button>

              <button
                onClick={() => topic.trim() && onStart(topic, 'deep')}
                disabled={!topic.trim()}
                className="group relative flex flex-col items-start p-4 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white hover:border-purple-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                 <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-2xl mb-2">🧠</span>
                <span className="font-bold text-slate-800">Deep Dive</span>
                <span className="text-xs text-slate-500 mt-1">Thorough analysis with multiple rounds of debate</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A9.948 9.948 0 0 1 10 13c1.657 0 3.22.463 4.543 1.28A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
            </svg>
            Auto mode uses available agents in this space
          </p>
        </div>
      </div>
    </div>
  );
}
