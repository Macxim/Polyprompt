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

    case "CLEAR_ACTIVE_AGENT":
      return { ...state, activeAgentId: null };

    //
    // ────────────────────────────────
    //  SPACES
    // ────────────────────────────────
    //
    case "ADD_SPACE": {
      let newSpace = action.payload;

      // Phase 2: Auto-populate for New Users
      // If this is the first space being created, add the core default agents
      if (state.spaces.length === 0) {
        const coreAgentIds = [
          "strategic_analyst",
          "devils_advocate",
          "creative_ideator",
          "practical_realist",
          "research_synthesizer",
        ];

        // Ensure we only add agents that actually exist in the state
        const validAgentIds = coreAgentIds.filter(id =>
          state.agents.some(a => a.id === id)
        );

        newSpace = {
          ...newSpace,
          agentIds: [...(newSpace.agentIds || []), ...validAgentIds],
        };
      }

      return {
        ...state,
        spaces: [...state.spaces, newSpace],
      };
    }

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
                updatedAt: Date.now(),
              };
            }),
          };
        }),
      };
    }

    case "UPDATE_MESSAGE": {
      const { spaceId, conversationId, messageId, content, tokens } = action.payload;

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
                messages: conv.messages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, content, ...(tokens && { tokens }) }
                    : msg
                ),
                updatedAt: Date.now(),
              };
            }),
          };
        }),
      };
    }

    case "RENAME_CONVERSATION": {
      const { spaceId, conversationId, newTitle } = action.payload;

      return {
        ...state,
        spaces: state.spaces.map((space) => {
          if (space.id !== spaceId) return space;
          return {
            ...space,
            conversations: space.conversations.map((conv) => {
              if (conv.id !== conversationId) return conv;
              return { ...conv, title: newTitle, updatedAt: Date.now() };
            }),
          };
        }),
      };
    }

    case "DELETE_CONVERSATION": {
      const { spaceId, conversationId } = action.payload;

      return {
        ...state,
        spaces: state.spaces.map((space) => {
          if (space.id !== spaceId) return space;
          return {
            ...space,
            conversations: space.conversations.filter((conv) => conv.id !== conversationId),
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
