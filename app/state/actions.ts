import { Agent, AppState, Space, Message } from "../types";

// Every possible action the app can perform:
export type Action =
  | { type: "ADD_AGENT"; payload: Agent }
  | { type: "UPDATE_AGENT"; payload: Agent }
  | { type: "DELETE_AGENT"; payload: { id: string } }
  | { type: "ADD_SPACE"; payload: Space }
  | { type: "UPDATE_SPACE"; id: string; changes: Partial<Space> }
  | { type: "DELETE_SPACE"; payload: { id: string } }
  | { type: "SET_ACTIVE_SPACE"; payload: { id: string } }
  | { type: "CLEAR_ACTIVE_AGENT" }
  | { type: "SET_ACTIVE_AGENT"; payload: { id: string | null } }
  | {
      type: "ADD_MESSAGE";
      payload: { spaceId: string; conversationId: string; message: Message };
    }
  | { type: "DELETE_CONVERSATION"; payload: { spaceId: string; conversationId: string } }
  | { type: "OPEN_AGENT_MODAL" }
  | { type: "CLOSE_AGENT_MODAL" }
  | { type: "OPEN_SPACE_MODAL" }
  | { type: "CLOSE_SPACE_MODAL" }
  | { type: "OPEN_CONVERSATION_MODAL" }
  | { type: "CLOSE_CONVERSATION_MODAL" }
  | { type: "SET_BANNER"; payload: { message: string | null } }
  | { type: "HYDRATE_APP"; payload: AppState };
