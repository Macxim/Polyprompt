import { Agent, Space, Message } from "../types";

// Every possible action the app can perform:
export type Action =
  | { type: "ADD_AGENT"; payload: Agent }
  | { type: "UPDATE_AGENT"; payload: Agent }
  | { type: "DELETE_AGENT"; payload: { id: string } }
  | { type: "ADD_SPACE"; payload: Space }
  | { type: "UPDATE_SPACE"; payload: Space }
  | { type: "DELETE_SPACE"; payload: { id: string } }
  | { type: "SET_ACTIVE_SPACE"; payload: { id: string | null } }
  | { type: "SET_ACTIVE_AGENT"; payload: { id: string | null } }
  | {
      type: "ADD_MESSAGE";
      payload: { spaceId: string; conversationId: string; message: Message };
    }
  | { type: "OPEN_AGENT_MODAL" }
  | { type: "CLOSE_AGENT_MODAL" }
  | { type: "OPEN_SPACE_MODAL" }
  | { type: "CLOSE_SPACE_MODAL" }
  | { type: "SET_BANNER"; payload: { message: string | null } };
