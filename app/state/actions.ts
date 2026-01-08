import { Agent, AppState, Conversation, Message } from "../types";

// Every possible action the app can perform:
export type Action =
  // Agents
  | { type: "ADD_AGENT"; payload: Agent }
  | { type: "UPDATE_AGENT"; payload: Agent }
  | { type: "DELETE_AGENT"; payload: { id: string } }
  | { type: "SET_ACTIVE_AGENT"; payload: { id: string | null } }
  | { type: "CLEAR_ACTIVE_AGENT" }
  // Conversations (flat, no spaceId)
  | { type: "ADD_CONVERSATION"; payload: Conversation }
  | { type: "UPDATE_CONVERSATION"; payload: { id: string; changes: Partial<Conversation> } }
  | { type: "DELETE_CONVERSATION"; payload: { id: string } }
  | { type: "SET_ACTIVE_CONVERSATION"; payload: { id: string | null } }
  // Messages (flat, just conversationId)
  | {
      type: "ADD_MESSAGE";
      payload: { conversationId: string; message: Message };
    }
  | {
      type: "UPDATE_MESSAGE";
      payload: {
        conversationId: string;
        messageId: string;
        content: string;
        tokens?: { prompt: number; completion: number; total: number };
        stance?: string;
        round?: number;
        phase?: string;
      };
    }
  | {
      type: "RENAME_CONVERSATION";
      payload: { conversationId: string; newTitle: string };
    }
  // UI
  | { type: "OPEN_AGENT_MODAL" }
  | { type: "CLOSE_AGENT_MODAL" }
  | { type: "OPEN_CONVERSATION_MODAL" }
  | { type: "CLOSE_CONVERSATION_MODAL" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_BANNER"; payload: { message: string | null; type?: "success" | "error" } }
  | { type: "HYDRATE_APP"; payload: AppState };
