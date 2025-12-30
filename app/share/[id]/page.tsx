import { redis } from "@/lib/redis";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import ChatMessage from "@/app/components/ChatMessage";
import { Agent, Message } from "@/app/types";

export const dynamic = 'force-dynamic';

async function getSharedConversation(id: string) {
  try {
    const data = await redis.get(`share:${id}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error("Fetch share error:", error);
    return null;
  }
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sharedData = await getSharedConversation(id);

  if (!sharedData) {
    notFound();
  }

  const { title, messages, agents, sharedAt } = sharedData;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      {/* Public Header */}
      <header className="glass-panel sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-200/50 shadow-sm bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-800 leading-tight">{title}</h1>
            <p className="text-xs text-slate-500">
              Shared on {new Date(sharedAt).toLocaleDateString()} • Read-only link
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full border border-indigo-100">
              Polyprompt
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
        {messages.map((message: Message, idx: number) => {
          const agent = message.role === "agent"
            ? agents?.find((a: Agent) => a.id === message.agentId)
            : null;

          return (
            <div key={message.id || idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                {message.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-2">
                    <AvatarDisplay
                      agent={{
                        id: message.agentId || "unknown",
                        name: message.agentName || "Agent",
                        avatar: agent?.avatar
                      }}
                      size="sm"
                    />
                    <span className="font-bold text-sm text-slate-900">
                      {message.agentName || "Agent"}
                    </span>
                    {agent?.persona && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider font-semibold">
                            {agent.persona}
                        </span>
                    )}
                  </div>
                )}
                <div className="prose prose-sm max-w-none prose-slate">
                   <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-12 pb-8 text-center">
            <p className="text-slate-400 text-sm">
                This is a shared conversation from <strong>Polyprompt</strong>.
            </p>
            <a
                href="/"
                className="inline-block mt-4 px-6 py-2 bg-white border border-slate-200 rounded-full text-indigo-600 font-medium hover:shadow-md transition-shadow"
            >
                Create your own space →
            </a>
        </div>
      </main>
    </div>
  );
}
