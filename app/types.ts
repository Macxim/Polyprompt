export type Agent = {
  id: string;
  name: string;
  persona: string;
  messages?: Message[];
  description?: string;
};

export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  agentId?: string;
  agentName?: string;
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
