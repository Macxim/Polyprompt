import { Agent, Conversation } from "../types";
import { DEFAULT_AGENTS } from "../data/defaultAgents";

export type AppState = {
  agents: Agent[];
  conversations: Conversation[];
  activeConversationId: string | null;
  activeAgentId: string | null;
  ui: {
    isAgentModalOpen: boolean;
    isConversationModalOpen: boolean;
    isSidebarOpen: boolean;
    bannerMessage: { message: string | null; type?: "success" | "error" };
  };
  _hydrated: boolean;
};

export const initialAppState: AppState = {
  agents: DEFAULT_AGENTS,
  conversations: [],
  activeConversationId: null,
  activeAgentId: null,
  ui: {
    isAgentModalOpen: false,
    isConversationModalOpen: false,
    isSidebarOpen: false,
    bannerMessage: { message: null, type: "success" },
  },
  _hydrated: false,
};
