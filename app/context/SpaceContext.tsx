"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Message, Space } from "../types";

type SpaceContextType = {
  spaces: Space[];
  setSpaces: React.Dispatch<React.SetStateAction<Space[]>>;
  addSpace: (name: string) => void;
  addConversation: (spaceId: string) => void;
  addAgent: (spaceId: string) => void;
  updateAgentPersona: (
    spaceId: string,
    agentId: string,
    persona: string
  ) => void;
  addMessageToSpaces: (
    prevSpaces: Space[],
    spaceId: string,
    convId: string,
    content: string
  ) => Space[];
  addAgentMessageToSpaces: (
    prevSpaces: Space[],
    spaceId: string,
    convId: string,
    agentId: string,
    content: string
  ) => Space[];
};

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

export const SpaceProvider = ({ children }: { children: ReactNode }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);

  const addSpace = (name: string) => {
    setSpaces([
      ...spaces,
      { id: Date.now().toString(), name, agentIds: [], conversations: [] },
    ]);
  };

  const addConversation = (spaceId: string) => {
    const newConversation = {
      id: crypto.randomUUID(),
      title: `New conversation - ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: new Date(),
    };

    setSpaces((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              conversations: [...space.conversations, newConversation],
            }
          : space
      )
    );
  };

  const addAgent = (spaceId: string) => {
    // Logic removed to match updated type definitions (agentIds).
  };

  const updateAgentPersona = (
    spaceId: string,
    agentId: string,
    persona: string
  ) => {
    // Logic removed.
  };

  const addMessageToSpaces = (
    prevSpaces: Space[],
    spaceId: string,
    convId: string,
    content: string
  ): Space[] => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    return prevSpaces.map((space) =>
      space.id !== spaceId
        ? space
        : {
            ...space,
            conversations: space.conversations.map((conv) =>
              conv.id !== convId
                ? conv
                : { ...conv, messages: [...conv.messages, newMessage] }
            ),
          }
    );
  };

  const addAgentMessageToSpaces = (
    prevSpaces: Space[],
    spaceId: string,
    convId: string,
    agentId: string,
    content: string
  ): Space[] => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "agent",
      content,
    };

    return prevSpaces.map((space) =>
      space.id !== spaceId
        ? space
        : {
            ...space,
            conversations: space.conversations.map((conv) =>
              conv.id !== convId
                ? conv
                : { ...conv, messages: [...conv.messages, newMessage] }
            ),
          }
    );
  };

  return (
    <SpaceContext.Provider
      value={{
        spaces,
        setSpaces,
        addSpace,
        addConversation,
        addAgent,
        updateAgentPersona,
        addMessageToSpaces,
        addAgentMessageToSpaces,
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
