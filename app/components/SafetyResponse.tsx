import React from 'react';
import { AlertTriangle, Phone, MessageCircle, Heart, LifeBuoy, ArrowLeft } from 'lucide-react';

interface SafetyResponseProps {
  message: string;
  reason?: string;
}

export function SafetyResponse({ message, reason }: SafetyResponseProps) {
  return (
    <div className="max-w-3xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative">
        {/* Subtle Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />

        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50 dark:ring-red-900/10">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            We Can't Debate This
          </h2>
          <div className="max-w-2xl text-slate-600 dark:text-slate-400 leading-relaxed text-xl">
            {message}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            <h3 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-sm flex items-center gap-2">
              <LifeBuoy className="w-4 h-4" />
              Immediate Support
            </h3>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <a
              href="tel:988"
              className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-xl transition-all rounded-2xl group"
            >
              <div className="w-12 h-12 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Call 988
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                  Suicide & Crisis Lifeline. Available 24/7 in US & Canada.
                </div>
              </div>
            </a>

            <a
              href="sms:741741&body=HOME"
              className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 hover:shadow-xl transition-all rounded-2xl group"
            >
              <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Text HOME to 741741
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                  Crisis Text Line. Connect with a volunteer counselor.
                </div>
              </div>
            </a>
          </div>

          <a
            href="https://findahelpline.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all rounded-2xl group shadow-lg shadow-slate-200 dark:shadow-none"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 dark:bg-slate-100 rounded-xl flex items-center justify-center text-white dark:text-slate-900">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-lg mb-0.5">International Support</div>
                <div className="text-sm opacity-70">Find help anywhere at findahelpline.com</div>
              </div>
            </div>
            <div className="hidden sm:block opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
              <ArrowLeft className="w-6 h-6 rotate-180" />
            </div>
          </a>

          <div className="text-center">
            <p className="text-slate-400 italic text-sm">
              "You are not alone. Support is available right now."
            </p>
          </div>
        </div>

        {reason && (
          <div className="mt-12 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Security Identifier: {reason}
            </div>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
