import { kv } from "@vercel/kv";
import { SharedConversation } from "../../types";
import { Metadata } from "next";
import Link from "next/link";
import AvatarDisplay from "../../components/AvatarDisplay";
import ReactMarkdown from "react-markdown";

type Props = {
  params: { shareId: string };
};

// Force dynamic rendering if using KV in a way that needs it?
// Actually for specific IDs it's dynamic.
export const revalidate = 0;

async function getSharedConversation(shareId: string): Promise<SharedConversation | null> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const data = await kv.get<SharedConversation>(`share:${shareId}`);
    return data;
  } catch (e) {
    console.error("Failed to fetch shared conversation", e);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const conversation = await getSharedConversation(params.shareId);
  return {
    title: conversation ? `Shared: ${conversation.title}` : "Conversation Not Found",
  };
}

export default async function SharedPage({ params }: Props) {
  const conversation = await getSharedConversation(params.shareId);

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
           <div className="text-6xl mb-4">😶</div>
           <h1 className="text-2xl font-bold text-slate-800 mb-2">Conversation Not Found</h1>
           <p className="text-slate-500 mb-6">This link might be invalid or the conversation was removed.</p>
           <Link href="/" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
             Go Home
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">P</div>
             <div>
                <h1 className="font-bold text-slate-800">{conversation.title}</h1>
                <p className="text-xs text-slate-500">Shared on {new Date(conversation.sharedAt).toLocaleDateString()}</p>
             </div>
          </div>
          <Link href="/" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors">
             Try Polyprompt
          </Link>
       </div>

       {/* Chat Area */}
       <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
               <div
                className={`max-w-[85%] sm:max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none"
                    : msg.isSummary
                      ? "bg-amber-50 border border-amber-200 text-slate-800 rounded-bl-none ring-4 ring-amber-50/50"
                      : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                }`}
              >
                {msg.isSummary && (
                  <div className="mb-3 pb-2 border-b border-amber-200/50 flex items-center gap-2">
                     <span className="text-xl">📝</span>
                     <span className="font-bold text-amber-800 text-xs uppercase tracking-wider">Discussion Summary</span>
                  </div>
                )}
                {/* Agent Header (Simulated since we don't have full Agent objects in read-only view unless we embed them?
                    Actually message has agentName/agentId, but we might lack avatar unless we saved it in message or fetch defaults.
                    For now, rely on AvatarDisplay's fallback or Message props.)
                    Wait, AvatarDisplay needs full Agent object.
                    We should probably construct a minimal agent object from message info.
                */}
                {msg.role === "agent" && (
                   <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100/50">
                     <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                        {msg.agentName?.[0] || "A"}
                     </div>
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                       {msg.agentName}
                     </span>
                   </div>
                )}

                <div className={`prose prose-sm ${msg.role === "user" ? "prose-invert" : "prose-slate"} max-w-none leading-relaxed overflow-x-auto`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
       </div>
    </div>
  );
}
