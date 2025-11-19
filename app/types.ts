export type Agent = {
  id: string;
  name: string;
  persona: string;
  messages?: Message[];
};

export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

export type Space = {
  id: string;
  name: string;
  agents: Agent[];
  conversations: Conversation[];
};
