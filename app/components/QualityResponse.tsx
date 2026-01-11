import React from 'react';
import { Lightbulb, HelpCircle, Sparkles, ArrowRight } from 'lucide-react';

interface QualityResponseProps {
  message: string;
  reason?: string;
  category?: 'trivial' | 'nonsensical' | 'already_decided' | 'not_actionable' | 'good';
}

const categoryInfo = {
  trivial: {
    icon: HelpCircle,
    color: 'blue',
    title: 'Too Trivial to Debate',
    emoji: '🤷',
    bg: 'bg-blue-50/50',
    border: 'border-blue-100',
    text: 'text-blue-900',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  nonsensical: {
    icon: HelpCircle,
    color: 'purple',
    title: 'Question Unclear',
    emoji: '❓',
    bg: 'bg-purple-50/50',
    border: 'border-purple-100',
    text: 'text-purple-900',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  already_decided: {
    icon: HelpCircle,
    color: 'amber',
    title: 'Already in the Past',
    emoji: '⏮️',
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    text: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600'
  },
  not_actionable: {
    icon: HelpCircle,
    color: 'slate',
    title: 'Not Actionable',
    emoji: '🤔',
    bg: 'bg-slate-50/50',
    border: 'border-slate-100',
    text: 'text-slate-900',
    iconBg: 'bg-slate-200',
    iconColor: 'text-slate-600'
  },
  good: {
    icon: Sparkles,
    color: 'emerald',
    title: 'Great Question!',
    emoji: '✨',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-100',
    text: 'text-emerald-900',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  }
};

export function QualityResponse({ message, reason, category = 'trivial' }: QualityResponseProps) {
  const info = categoryInfo[category] || categoryInfo.trivial;
  const Icon = info.icon;

  return (
    <div className="max-w-3xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative">
        {/* Subtle Accent Line */}
        <div className={`absolute top-0 left-0 w-full h-2 bg-${info.color}-500 opacity-20`} />

        <div className="flex flex-col items-center text-center mb-10">
          <div className={`w-20 h-20 ${info.iconBg} dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50 dark:ring-slate-800/50 text-3xl`}>
            {info.emoji}
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            {info.title}
          </h2>
          <div className="max-w-2xl text-slate-600 dark:text-slate-400 leading-relaxed text-xl">
            {message}
          </div>
          {reason && (
            <p className="mt-4 text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">
              — {reason}
            </p>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Questions That Work Well
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 dark:text-slate-300">
            {[
              { label: 'Career choices', example: '"Should I quit my job?"' },
              { label: 'Tech stacks', example: '"React vs Vue for this project?"' },
              { label: 'Lifestyle habits', example: '"Remote vs Office work?"' },
              { label: 'Personal growth', example: '"Should I start a business?"' }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3 group">
                <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
                  <span className="text-sm opacity-70 italic">{item.example}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/50">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="text-amber-500 font-bold">💡 Tip:</span>
              Good questions have real stakes, tradeoffs, and help you make actionable decisions.
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl"
            >
              Try Another Question
              <ArrowRight className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
}
