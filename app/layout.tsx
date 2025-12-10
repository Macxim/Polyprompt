import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { AppProvider } from "./state/AppProvider";
import Link from "next/link"; // For the sidebar navigation

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Polyprompt",
  description: "Spaces and AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-slate-50 relative flex h-screen overflow-hidden`}>
        <AppProvider>
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-20 shadow-sm relative">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  P
                </div>
                <span className="font-outfit font-bold text-xl text-slate-800 tracking-tight">Polyprompt</span>
              </div>

              <nav className="space-y-1">
                <NavItem href="/" icon={<HomeIcon />} label="Spaces" />
                <NavItem href="/agents" icon={<UsersIcon />} label="Agents" />
              </nav>
            </div>

            <div className="mt-auto p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <UserIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">User</p>
                  <p className="text-xs text-slate-400 truncate">Settings</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto relative bg-slate-50/50">
             {/* Subtle background decoration */}
             <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-30">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-200 blur-3xl mix-blend-multiply filter opacity-50 animate-blob"></div>
                <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-indigo-200 blur-3xl mix-blend-multiply filter opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-blue-100 blur-3xl mix-blend-multiply filter opacity-50 animate-blob animation-delay-4000"></div>
             </div>

             <div className="relative z-10 h-full">
               {children}
             </div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}

// Simple NavItem component
function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all group font-medium text-sm">
      <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{icon}</span>
      {label}
    </Link>
  );
}

// Icons
function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  );
}
