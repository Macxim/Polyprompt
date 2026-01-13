import React from 'react';
import { Zap, Key, Cpu, ShieldCheck, ArrowRight, LogIn } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

interface QuotaLimitResponseProps {
  message: string;
}

export function QuotaLimitResponse({ message }: QuotaLimitResponseProps) {
  const { status } = useSession();

  return (
    <div className="max-w-3xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-100 dark:border-amber-900/30 rounded-3xl p-1 shadow-2xl shadow-amber-100/50 dark:shadow-none overflow-hidden relative">
        {/* Subtle Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-amber-400" />

        <div className="p-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 ring-8 ring-amber-50/50 dark:ring-amber-900/10 rotate-3">
              <Cpu className="w-10 h-10 text-amber-600 dark:text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Daily Limit Reached
            </h2>
            <div className="max-w-2xl text-slate-600 dark:text-slate-400 leading-relaxed text-xl">
              {message}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {status === 'unauthenticated' ? (
              <button
                onClick={() => signIn('google')}
                className="flex items-start gap-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-xl transition-all rounded-2xl group text-left"
              >
                <div className="w-12 h-12 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <LogIn className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Sign In / Join
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                    Save your conversations and get a higher starting quota.
                  </div>
                </div>
              </button>
            ) : (
               <div className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl opacity-60">
                <div className="w-12 h-12 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-lg mb-1">
                    Signed In
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                    You've used your basic allowance for today.
                  </div>
                </div>
              </div>
            )}

            <Link
              href="/settings"
              className="flex items-start gap-4 p-6 bg-amber-50 dark:bg-amber-900/20 hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-amber-100 dark:hover:border-amber-900/50 hover:shadow-xl transition-all rounded-2xl group text-left"
            >
              <div className="w-12 h-12 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2">
                  Go Unlimited
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                  Add your own OpenAI API key to remove all daily limits forever.
                </div>
              </div>
            </Link>
          </div>

          <div className="bg-slate-900 dark:bg-white rounded-2xl p-6 text-white dark:text-slate-900 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 dark:bg-slate-100 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Why use your own key?</div>
              <div className="text-sm opacity-70">Pay only for what you use, directly to OpenAI. No middleman, no markups.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
