"use client";

import { useEffect, useState } from "react";
import { useApp } from "../state/AppProvider";
import { useRouter } from "next/navigation";

type Props = {
  spaceId: string;
};

export default function ConversationModal({ spaceId }: Props) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");

  const space = state.spaces.find((s) => s.id === spaceId);

  // Reset form when modal opens
  useEffect(() => {
    if (state.ui.isConversationModalOpen) {
      setTitle("");
      setTitleError("");
    }
  }, [state.ui.isConversationModalOpen]);

  const handleSubmit = () => {
    // Validate
    if (!title.trim()) {
      setTitleError("Conversation name is required");
      return;
    }

    // Check if space has agents
    if (!space || !space.agentIds || space.agentIds.length === 0) {
      dispatch({
        type: "SET_BANNER",
        payload: { message: "Add an agent before starting a conversation." },
      });
      dispatch({ type: "CLOSE_CONVERSATION_MODAL" });
      return;
    }

    // Create the conversation
    const newConversationId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    dispatch({
      type: "UPDATE_SPACE",
      id: space.id,
      changes: {
        conversations: [
          ...space.conversations,
          {
            id: newConversationId,
            title: title.trim(),
            messages: [],
          },
        ],
      },
    });

    dispatch({ type: "SET_BANNER", payload: { message: "Conversation created." } });
    dispatch({ type: "CLOSE_CONVERSATION_MODAL" });

    // Navigate to the new conversation
    router.push(`/space/${spaceId}/conversation/${newConversationId}`);
  };

  if (!state.ui.isConversationModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          New Conversation
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Conversation Name
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g., Project Brainstorm"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              autoFocus
            />
            {titleError && (
              <p className="text-red-600 text-sm mt-1">{titleError}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => dispatch({ type: "CLOSE_CONVERSATION_MODAL" })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
          >
            Create & Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}
