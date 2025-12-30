"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function SignInForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Logo / Branding Area */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-200">
          <span className="text-3xl font-bold text-white">P</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Polyprompt</h1>
        <p className="mt-3 text-lg text-slate-600">The multi-agent collaborative workspace.</p>
      </div>

      {/* Action Card */}
      <div className="glass-panel rounded-3xl p-10 shadow-2xl shadow-slate-200">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-slate-800">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to access your spaces and conversations</p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-slate-700 border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="h-px w-full bg-slate-200"></span>
          <span className="shrink-0">SECURE LOGIN</span>
          <span className="h-px w-full bg-slate-200"></span>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-slate-400">
          By continuing, you agree to our <br />
          <span className="cursor-pointer font-medium hover:text-slate-600">Terms of Service</span> and <span className="cursor-pointer font-medium hover:text-slate-600">Privacy Policy</span>.
        </p>
      </div>

      {/* Footer Info */}
      <p className="mt-12 text-center text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Polyprompt. All rights reserved.
      </p>
    </div>
  )
}

export default function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Suspense fallback={
        <div className="w-full max-w-md animate-pulse">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-slate-200" />
            <div className="h-10 w-48 mx-auto bg-slate-200 rounded" />
            <div className="h-6 w-64 mx-auto bg-slate-100 rounded mt-3" />
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl p-10 h-64 shadow-sm" />
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  )
}
