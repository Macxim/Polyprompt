"use client"

import { useSession, signOut } from "next-auth/react"
import AvatarDisplay from "./AvatarDisplay"

export default function UserMenu() {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 border border-slate-100 shadow-sm">
      <div className="shrink-0">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || ""}
            className="h-9 w-9 rounded-full border border-white shadow-sm"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-white shadow-sm">
            {session.user.name?.[0].toUpperCase() || "U"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">
          {session.user.name}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
