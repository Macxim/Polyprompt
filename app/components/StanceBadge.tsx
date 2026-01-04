"use client";

import React from 'react';

interface StanceBadgeProps {
  stance?: string;
  round?: number;
  phase?: string;
}

const StanceBadge: React.FC<StanceBadgeProps> = ({ stance, round, phase }) => {
  if (!stance && !round && !phase) return null;

  const phaseEmoji: Record<string, string> = {
    'OPENING': '🎯',
    'CONFRONTATION': '⚔️',
    'SYNTHESIS': '🤝'
  };

  const currentPhaseEmoji = phase ? (phaseEmoji[phase.toUpperCase()] || '💬') : '💬';

  return (
    <div className="flex items-center gap-2">
      {round && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-100 border border-slate-700 uppercase tracking-tighter">
          Round {round}
        </span>
      )}

      {phase && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-white/50 text-slate-700 border-slate-200 backdrop-blur-sm">
          <span>{currentPhaseEmoji}</span>
          <span>{phase}</span>
        </span>
      )}

      {stance && stance.toLowerCase() !== 'neutral' && stance.toLowerCase() !== 'summary' && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm">
          <span>⚖️</span>
          <span>Favors: {stance}</span>
        </span>
      )}

      {stance && (stance.toLowerCase() === 'neutral' || stance.toLowerCase() === 'summary') && !phase && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-slate-50 text-slate-600 border-slate-200">
          <span>🤝</span>
          <span>Synthesis</span>
        </span>
      )}
    </div>
  );
};

export default StanceBadge;
