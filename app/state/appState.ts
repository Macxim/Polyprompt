import { Agent, Space } from "../types";

export type AppState = {
  agents: Agent[];
  spaces: Space[];
  activeSpaceId: string | null;
  activeAgentId: string | null;
  ui: {
    isAgentModalOpen: boolean;
    isSpaceModalOpen: boolean;
    bannerMessage: string | null;
  };
  _hydrated: boolean;
};

export const initialAppState: AppState = {
  agents: [],
  spaces: [],
  activeSpaceId: null,
  activeAgentId: null,
  ui: {
    isAgentModalOpen: false,
    isSpaceModalOpen: false,
    bannerMessage: null,
  },
  _hydrated: false,
};
