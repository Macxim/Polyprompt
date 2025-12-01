import { AppState } from "./appState";
import { Action } from "./actions";

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "HYDRATE_APP":
      return {
        ...action.payload,
      };

    //
    // ────────────────────────────────
    //  AGENTS
    // ────────────────────────────────
    //
    case "ADD_AGENT":
      return {
        ...state,
        agents: [...state.agents, action.payload],
      };

    case "UPDATE_AGENT":
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.id ? action.payload : agent
        ),
      };

    case "DELETE_AGENT":
      return {
        ...state,
        agents: state.agents.filter((a) => a.id !== action.payload.id),
      };

    case "CLEAR_ACTIVE_AGENT":
      return { ...state, activeAgentId: null };

    //
    // ────────────────────────────────
    //  SPACES
    // ────────────────────────────────
    //
    case "ADD_SPACE":
      return {
        ...state,
        spaces: [...state.spaces, action.payload],
      };

    case "UPDATE_SPACE":
      return {
        ...state,
        spaces: state.spaces.map((s) =>
          s.id === action.id ? { ...s, ...action.changes } : s
        ),
      };

    case "DELETE_SPACE":
      return {
        ...state,
        spaces: state.spaces.filter((s) => s.id !== action.payload.id),
      };

    case "SET_ACTIVE_SPACE":
      return {
        ...state,
        activeSpaceId: action.payload.id,
      };

    case "SET_ACTIVE_AGENT":
      return {
        ...state,
        activeAgentId: action.payload.id,
      };

    //
    // ────────────────────────────────
    //  MESSAGES
    // ────────────────────────────────
    //
    case "ADD_MESSAGE": {
      const { spaceId, conversationId, message } = action.payload;

      return {
        ...state,
        spaces: state.spaces.map((space) => {
          if (space.id !== spaceId) return space;
          return {
            ...space,
            conversations: space.conversations.map((conv) => {
              if (conv.id !== conversationId) return conv;
              return {
                ...conv,
                messages: [...conv.messages, message],
              };
            }),
          };
        }),
      };
    }

    //
    // ────────────────────────────────
    //  UI / MODALS / BANNERS
    // ────────────────────────────────
    //
    case "OPEN_AGENT_MODAL":
      return {
        ...state,
        ui: { ...state.ui, isAgentModalOpen: true },
      };

    case "CLOSE_AGENT_MODAL":
      return {
        ...state,
        ui: { ...state.ui, isAgentModalOpen: false },
      };

    case "OPEN_SPACE_MODAL":
      return {
        ...state,
        ui: { ...state.ui, isSpaceModalOpen: true },
      };

    case "CLOSE_SPACE_MODAL":
      return {
        ...state,
        ui: { ...state.ui, isSpaceModalOpen: false },
      };

    case "SET_BANNER":
      return {
        ...state,
        ui: { ...state.ui, bannerMessage: action.payload.message },
      };

    default:
      return state;
  }
};
