"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../state/AppProvider";
import { useMemo } from "react";
import UserMenu from "./UserMenu";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const pathname = usePathname();
  const { data: session } = useSession();

  const closeSidebar = () => {
    dispatch({ type: "SET_SIDEBAR_OPEN", payload: false });
  };

  const recentChats = useMemo(() => {
    const all = state.spaces.flatMap((s) =>
      s.conversations.map((c) => ({
        ...c,
        spaceId: s.id,
        spaceName: s.name,
      }))
    );

    // Sort by updatedAt (newest first). If missing, we can use 0.
    return all
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5);
  }, [state.spaces]);

  return (
    <>
      {/* Mobile Overlay */}
      {state.ui.isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden animate-fade-in"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-30 shadow-md md:shadow-none transition-transform duration-300 transform ${
          state.ui.isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                P
              </div>
              <span className="font-outfit font-bold text-xl text-slate-800 tracking-tight">
                Polyprompt
              </span>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={closeSidebar}
              className="md:hidden text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="space-y-1">
            <NavItem
              href="/"
              icon={<HomeIcon />}
              label="Spaces"
              isActive={pathname === "/"}
              onClick={closeSidebar}
            />
            <NavItem
              href="/agents"
              icon={<UsersIcon />}
              label="Agents"
              isActive={pathname === "/agents"}
              onClick={closeSidebar}
            />
          </nav>
        </div>

        {session && (
          <div className="flex-1 overflow-y-auto px-6 py-4 border-t border-slate-50">
             <h3 className="text-xs ml-3 font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               Recent Chats
             </h3>
             <div className="space-y-1">
               {!state._hydrated ? (
                 // Loading Skeleton
                 [1, 2, 3].map((i) => (
                   <div key={i} className="px-3 py-3 rounded-lg border border-transparent animate-pulse">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-4 h-4 rounded bg-slate-100"></div>
                       <div className="h-3 bg-slate-100 rounded w-24"></div>
                     </div>
                     <div className="h-2 bg-slate-50 rounded w-16 ml-6"></div>
                   </div>
                 ))
               ) : recentChats.length === 0 ? (
                 <p className="text-[11px] text-slate-400 italic px-3 py-2">No recent chats yet.</p>
               ) : (
                 recentChats.map((chat) => (
                   <Link
                     key={chat.id}
                     href={`/space/${chat.spaceId}/conversation/${chat.id}`}
                     onClick={closeSidebar}
                     className={`flex flex-col px-3 py-2 rounded-lg transition-all group ${
                       pathname === `/space/${chat.spaceId}/conversation/${chat.id}`
                         ? "bg-indigo-50/80 border border-indigo-100 shadow-sm"
                         : "hover:bg-slate-50 border border-transparent"
                     }`}
                   >
                     <div className="flex items-center gap-2">
                       <span className="text-sm">💬</span>
                       <span className={`text-xs font-bold truncate flex-1 ${
                         pathname === `/space/${chat.spaceId}/conversation/${chat.id}` ? "text-indigo-700" : "text-slate-700"
                       }`}>
                         {chat.title}
                       </span>
                     </div>
                     <span className="text-[10px] text-slate-400 ml-6 truncate">
                       {chat.spaceName}
                     </span>
                   </Link>
                 ))
               )}
             </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          <UserMenu />
        </div>
        </div>
      </aside>
    </>
  );
}

// NavItem component
function NavItem({
  href,
  icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group font-medium text-sm ${
        isActive
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
      }`}
    >
      <span
        className={`transition-colors ${
          isActive
            ? "text-indigo-600"
            : "text-slate-400 group-hover:text-indigo-500"
        }`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

// Icons
function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path
        fillRule="evenodd"
        d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path
        fillRule="evenodd"
        d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
