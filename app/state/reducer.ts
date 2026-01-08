import { AppState } from "./appState";
import { Action } from "./actions";

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "HYDRATE_APP":
      return {
        ...action.payload,
        ui: {
          ...action.payload.ui,
          isConversationModalOpen: (action.payload.ui as any).isConversationModalOpen ?? false,
          isSidebarOpen: (action.payload.ui as any).isSidebarOpen ?? false,
        },
        _hydrated: true,
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

    case "SET_ACTIVE_AGENT":
      return {
        ...state,
        activeAgentId: action.payload.id,
      };

    case "CLEAR_ACTIVE_AGENT":
      return { ...state, activeAgentId: null };

    //
    // ────────────────────────────────
    //  CONVERSATIONS (Flat - no spaces)
    // ────────────────────────────────
    //
    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [...state.conversations, action.payload],
      };

    case "UPDATE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv.id === action.payload.id
            ? { ...conv, ...action.payload.changes }
            : conv
        ),
      };

    case "DELETE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.filter(
          (conv) => conv.id !== action.payload.id
        ),
        // Clear active if deleted
        activeConversationId:
          state.activeConversationId === action.payload.id
            ? null
            : state.activeConversationId,
      };

    case "SET_ACTIVE_CONVERSATION":
      return {
        ...state,
        activeConversationId: action.payload.id,
      };

    case "RENAME_CONVERSATION": {
      const { conversationId, newTitle } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, title: newTitle, updatedAt: Date.now() }
            : conv
        ),
      };
    }

    //
    // ────────────────────────────────
    //  MESSAGES (Flat - no spaceId)
    // ────────────────────────────────
    //
    case "ADD_MESSAGE": {
      const { conversationId, message } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            messages: [...conv.messages, message],
            updatedAt: Date.now(),
          };
        }),
      };
    }

    case "UPDATE_MESSAGE": {
      const { conversationId, messageId, content, tokens, stance, round, phase } =
        action.payload;

      return {
        ...state,
        conversations: state.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content,
                    ...(tokens && { tokens }),
                    ...(stance && { stance }),
                    ...(round !== undefined && { round }),
                    ...(phase !== undefined && { phase }),
                  }
                : msg
            ),
            updatedAt: Date.now(),
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

    case "OPEN_CONVERSATION_MODAL":
      return {
        ...state,
        ui: { ...state.ui, isConversationModalOpen: true },
      };

    case "CLOSE_CONVERSATION_MODAL":
      return {
        ...state,
        ui: { ...state.ui, isConversationModalOpen: false },
      };

    case "TOGGLE_SIDEBAR":
      return {
        ...state,
        ui: { ...state.ui, isSidebarOpen: !state.ui.isSidebarOpen },
      };

    case "SET_SIDEBAR_OPEN":
      return {
        ...state,
        ui: { ...state.ui, isSidebarOpen: action.payload },
      };

    case "SET_BANNER":
      return {
        ...state,
        ui: {
          ...state.ui,
          bannerMessage: action.payload,
        },
      };

    default:
      return state;
  }
};
