"use client"

import { useState, useEffect } from "react"
import { Check, Key, AlertCircle, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [error, setError] = useState("")
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    checkExistingKey()
  }, [])

  async function checkExistingKey() {
    try {
      const res = await fetch("/api/user/settings")
      const data = await res.json()
      setHasKey(!!data.hasApiKey)
    } catch (err) {
      console.error("Error checking API key:", err)
    }
  }

  async function validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      setError("Please enter an API key")
      return
    }

    if (!apiKey.startsWith("sk-")) {
      setError('Invalid API key format. OpenAI keys start with "sk-"')
      return
    }

    setError("")
    setSaving(true)
    setTesting(true)

    // Validate the key first
    const isValid = await validateApiKey(apiKey)

    if (!isValid) {
      setError("Invalid API key. Please check your key and try again.")
      setSaving(false)
      setTesting(false)
      return
    }

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiKey: apiKey }),
      })

      if (!res.ok) throw new Error("Failed to save")

      setSaved(true)
      setHasKey(true)
      setApiKey("")
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError("Failed to save API key. Please try again.")
    } finally {
      setSaving(false)
      setTesting(false)
    }
  }

  async function handleRemove() {
    if (!confirm("Remove your API key? You'll revert to free tier limits.")) return

    try {
      await fetch("/api/user/settings", {
        method: "DELETE",
      })
      setHasKey(false)
      setApiKey("")
    } catch (err) {
      setError("Failed to remove API key")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">API Settings</h1>
          <p className="mt-2 text-slate-600">
            Configure your own OpenAI API key for unlimited access and enhanced privacy.
          </p>
        </div>

        {/* Current Status */}
        {hasKey && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-sm shadow-indigo-100">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-900">API Key Connected</p>
                <p className="mt-1 text-xs leading-relaxed text-indigo-700/80">
                  You are currently using your own OpenAI API key. Daily limits are disabled, and you have access to all OpenAI models.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Configuration Card */}
        <div className="glass-card overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">OpenAI Configuration</h2>
              <p className="mt-1 text-sm text-slate-500">
                Encryption ensures your key remains private and secure.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 pr-12 font-mono text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Stored securely using AES-256-GCM. We never share your key.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSave}
                  disabled={saving || !apiKey.trim()}
                  className="flex-1 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {testing ? "Validating..." : "Saving..."}
                    </span>
                  ) : saved ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-5 w-5" />
                      Saved!
                    </span>
                  ) : (
                    "Connect Account"
                  )}
                </button>
                {hasKey && (
                  <button
                    onClick={handleRemove}
                    className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-[0.98]"
                  >
                    Remove Key
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-6">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Premium Benefits
              </h3>
              <ul className="space-y-4">
                {[
                  "Unlimited messages (bypass daily caps)",
                  "Access to premium GPT-4o models",
                  "Lower latency & higher rate limits",
                  "Direct control over billing & usage"
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                    <div className="mt-0.5 rounded-full bg-indigo-100 p-0.5 text-indigo-600">
                      <Check className="h-3 w-3" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Context Information */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 pb-12">
          <div className="glass-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-3xl border border-slate-200/60 bg-white p-8 group">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 tracking-tight">
              <ExternalLink className="h-5 w-5 text-indigo-500" />
              How to get a key
            </h3>
            <div className="space-y-4 text-sm leading-relaxed text-slate-500">
              <p>
                1. Sign up at <a href="https://platform.openai.com" target="_blank" className="font-bold text-indigo-600 hover:underline">OpenAI Platform</a>.
              </p>
              <p>
                2. Navigate to <span className="font-semibold">API Keys</span> in your dashboard.
              </p>
              <p>
                3. Create a new secret key and paste it here.
              </p>
              <div className="mt-4 rounded-xl bg-amber-50/50 p-4 text-[13px] text-amber-800 border border-amber-100 flex items-center gap-3">
                <span className="text-lg">💡</span>
                <span><span className="font-semibold text-amber-900">Tip:</span> Set a monthly budget in OpenAI billing to keep costs under control.</span>
              </div>
            </div>
          </div>

          <div className="glass-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-3xl border border-slate-200/60 bg-white p-8 [animation-delay:100ms]">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 tracking-tight">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              Privacy Matters
            </h3>
            <ul className="space-y-3 text-sm text-slate-500/90 leading-relaxed">
              <li className="flex items-center gap-3">
                <div className="h-1 w-1 rounded-full bg-indigo-400" />
                End-to-end industry standard encryption
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1 w-1 rounded-full bg-indigo-400" />
                Keys are never visible in logs or to staff
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1 w-1 rounded-full bg-indigo-400" />
                Direct communication with OpenAI API
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1 w-1 rounded-full bg-indigo-400" />
                Instantly revocable at any time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
