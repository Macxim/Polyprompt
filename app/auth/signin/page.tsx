"use client"

import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from "lucide-react"

function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (isRegistering) {
        // Register flow
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message || "Something went wrong")
        }

        // Auto login after registration
        const loginRes = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (loginRes?.error) {
           // Should not happen if registration worked, but fallback to login screen
           setIsRegistering(false)
           setError("Registration successful. Please sign in.")
        } else {
           router.push(callbackUrl)
        }

      } else {
        // Login flow
        const res = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (res?.error) {
          throw new Error("Invalid email or password")
        }

        router.push(callbackUrl)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
    setError("")
    setFormData({ name: "", email: "", password: "" })
  }

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
      <div className="glass-panel rounded-3xl p-8 md:p-10 shadow-2xl shadow-slate-200 bg-white/80 backdrop-blur-xl border border-white/20">
        <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800">
                {isRegistering ? "Create an account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
                {isRegistering
                    ? "Getting started is easy and free"
                    : "Sign in to access your spaces"}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {isRegistering && (
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 ml-1">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            name="name"
                            type="text"
                            required
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 ml-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        name="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        minLength={6}
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <>
                        {isRegistering ? "Create Account" : "Sign In"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="h-px w-full bg-slate-200"></span>
          <span className="shrink-0 font-medium">OR CONTINUE WITH</span>
          <span className="h-px w-full bg-slate-200"></span>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          type="button"
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-700 border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
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
          Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-500">
            {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
                onClick={toggleMode}
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
            >
                {isRegistering ? "Sign in" : "Sign up"}
            </button>
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-slate-100">
      <Suspense fallback={
        <div className="w-full max-w-md animate-pulse">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-slate-200" />
            <div className="h-10 w-48 mx-auto bg-slate-200 rounded" />
            <div className="h-6 w-64 mx-auto bg-slate-100 rounded mt-3" />
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl p-10 h-96 shadow-sm" />
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  )
}
