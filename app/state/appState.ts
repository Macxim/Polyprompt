import { Agent, Space } from "../types";
import { DEFAULT_AGENTS } from "../data/defaultAgents";

export type AppState = {
  agents: Agent[];
  spaces: Space[];
  activeSpaceId: string | null;
  activeAgentId: string | null;
  ui: {
    isAgentModalOpen: boolean;
    isSpaceModalOpen: boolean;
    isConversationModalOpen: boolean;
    isSidebarOpen: boolean;
    bannerMessage: { message: string | null };
  };
  _hydrated: boolean;
};

export const initialAppState: AppState = {
  agents: DEFAULT_AGENTS,
  spaces: [],
  activeSpaceId: null,
  activeAgentId: null,
  ui: {
    isAgentModalOpen: false,
    isSpaceModalOpen: false,
    isConversationModalOpen: false,
    isSidebarOpen: false,
    bannerMessage: { message: null },
  },
  _hydrated: false,
};
