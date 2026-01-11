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
  verbosity?: 'concise' | 'balanced' | 'detailed';
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
  respondingToId?: string; // ID of the message this is responding to (in debate mode)
  stance?: string; // Detected stance or label (e.g., 'pro', 'con', or a specific option name)
  round?: number;
  phase?: string;
  isRepetition?: boolean;
};

export type ConversationTemplate = {
  id: string;
  name: string;
  description: string;
  category: 'decision-making' | 'creative' | 'technical' | 'research';
  selectedAgents: string[]; // IDs of default agents
  startingPrompt?: string; // Optional guided question
  icon: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  participantIds: string[]; // Agent IDs in this conversation
  updatedAt?: number;
  safetyError?: { message: string; reason?: string } | null;
  qualityError?: {
    message: string;
    reason?: string;
    category?: 'trivial' | 'nonsensical' | 'already_decided' | 'not_actionable' | 'good'
  } | null;
};

export type SharedConversation = Conversation & {
  shareId: string;
  sharedAt: number;
};

// REMOVED: Space type - conversations now live directly under user

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
