"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Message, Space } from "../types";

type SpaceContextType = {
  spaces: Space[];
  addSpace: (name: string) => void;
  addConversation: (spaceId: string) => void;
  addMessage: (spaceId: string, convId: string, content: string) => void;
  addAgent: (spaceId: string) => void;
  updateAgentPersona: (
    spaceId: string,
    agentId: string,
    persona: string
  ) => void;
};

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

export const SpaceProvider = ({ children }: { children: ReactNode }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);

  const addSpace = (name: string) => {
    setSpaces([
      ...spaces,
      { id: Date.now().toString(), name, agents: [], conversations: [] },
    ]);
  };

  const addConversation = (spaceId: string) => {
    const newConversation = {
      id: crypto.randomUUID(),
      title: `New conversation - ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: new Date(),
    };

    const updatedSpaces = spaces.map((space) => {
      if (space.id === spaceId) {
        return {
          ...space,
          conversations: [...space.conversations, newConversation],
        };
      } else {
        return space;
      }
    });

    setSpaces(updatedSpaces);
  };

  const addAgent = (spaceId: string) => {
    const newAgent = {
      id: crypto.randomUUID(),
      name: `New Agent`,
      persona: "Helpful assistant",
    };
    const updatedSpaces = spaces.map((space) => {
      if (space.id === spaceId) {
        return {
          ...space,
          agents: [...space.agents, newAgent],
        };
      } else {
        return space;
      }
    });

    setSpaces(updatedSpaces);
  };

  const updateAgentPersona = (
    spaceId: string,
    agentId: string,
    persona: string
  ) => {
    const updatedSpaces = spaces.map((space) => {
      if (space.id === spaceId) {
        const updatedAgents = space.agents.map((agent) => {
          if (agent.id === agentId) {
            return {
              ...agent,
              persona,
            };
          } else {
            return agent;
          }
        });
        return {
          ...space,
          agents: updatedAgents,
        };
      } else {
        return space;
      }
    });

    setSpaces(updatedSpaces);
  };

  const addMessage = (spaceId: string, convId: string, content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const updatedSpaces = spaces.map((space) => {
      if (space.id === spaceId) {
        const updatedConversations = space.conversations.map((conversation) => {
          if (conversation.id === convId) {
            return {
              ...conversation,
              messages: [...conversation.messages, newMessage],
            };
          } else {
            return conversation;
          }
        });
        return {
          ...space,
          conversations: updatedConversations,
        };
      } else {
        return space;
      }
    });

    setSpaces(updatedSpaces);
  };

  return (
    <SpaceContext.Provider
      value={{
        spaces,
        addSpace,
        addConversation,
        addMessage,
        addAgent,
        updateAgentPersona,
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
};

export const useSpaces = () => {
  const context = useContext(SpaceContext);
  if (!context)
    throw new Error("useSpaces must be used within a SpaceProvider");
  return context;
};
