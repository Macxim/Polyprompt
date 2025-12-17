export type Agent = {
  id: string;
  name: string;
  persona: string;
  messages?: Message[];
  description?: string;
  model?: "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo";
  temperature?: number; // 0-1, default 0.7
  avatar?: string | null; // Image URL, emoji, or null for auto-generated
  isDefault?: boolean;
  isHidden?: boolean;
};

export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp?: number;
  isStreaming?: boolean;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  isSummary?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

export type Space = {
  id: string;
  name: string;
  agentIds: string[];
  conversations: Conversation[];
};

export type AppState = {
  agents: Agent[];
  spaces: Space[];
  activeSpaceId: string | null;
  activeAgentId: string | null;
  ui: {
    isAgentModalOpen: boolean;
    isSpaceModalOpen: boolean;
    bannerMessage: { message: string | null };
  };
};
