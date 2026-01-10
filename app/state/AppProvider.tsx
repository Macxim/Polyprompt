"use client";

import React, {
  createContext,
  useReducer,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { AppState, initialAppState } from "./appState";
import { reducer } from "./reducer";
import { Action } from "./actions";
import { useSession } from "next-auth/react";

// Define the shape of the context
type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [state, dispatch] = useReducer(reducer, initialAppState);

  // Sync with API or localStorage
  useEffect(() => {
    const syncData = async () => {
      // 1. Check if we have localStorage data to migrate
      const savedState = localStorage.getItem("appState");
      let localState: any = null;
      if (savedState) {
        try {
          localState = JSON.parse(savedState);
        } catch (err) {
          console.error("Failed to parse local app state", err);
        }
      }

      if (status === "authenticated" && session?.user?.id) {
        console.log("[AppProvider] Authenticated. Fetching from API...");
        try {
          const [agentsRes, conversationsRes] = await Promise.all([
            fetch("/api/agents"),
            fetch("/api/conversations"),
          ]);

          if (!agentsRes.ok || !conversationsRes.ok) {
            console.error("[AppProvider] API response error:", agentsRes.status, conversationsRes.status);
            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents: initialAppState.agents, conversations: [] }
            });
            return;
          }

          const agents = await agentsRes.json();
          const conversations = await conversationsRes.json();
          console.log(`[AppProvider] API data: ${agents.length} agents, ${conversations.length} conversations`);

          // Migration: Convert old spaces format to flat conversations
          const hasOldSpacesData = localState?.spaces && localState.spaces.length > 0;
          const hasLocalData = hasOldSpacesData || (localState?.agents && localState.agents.length > 8);

          if (localState && hasLocalData) {
            console.log("[AppProvider] Starting migration to Redis...");

            // Flatten spaces.conversations into top-level conversations
            let migratedConversations: any[] = [];
            if (hasOldSpacesData) {
              for (const space of localState.spaces) {
                for (const conv of space.conversations || []) {
                  migratedConversations.push({
                    ...conv,
                    participantIds: space.agentIds || [],
                  });
                }
              }
              console.log(`[AppProvider] Migrated ${migratedConversations.length} conversations from ${localState.spaces.length} spaces`);
            }

            try {
              const [agRes, convRes] = await Promise.all([
                fetch("/api/agents", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(localState.agents),
                }),
                fetch("/api/conversations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(migratedConversations),
                }),
              ]);

              if (agRes.ok && convRes.ok) {
                console.log("[AppProvider] Migration successful. Clearing local cache.");
                localStorage.removeItem("appState");
              } else {
                console.error("[AppProvider] Migration server error:", agRes.status, convRes.status);
                dispatch({
                  type: "SET_BANNER",
                  payload: { message: "Cloud sync failed. Data temporarily saved locally.", type: "error" }
                });
              }
            } catch (e) {
              console.error("[AppProvider] Migration network failure:", e);
              dispatch({
                type: "SET_BANNER",
                payload: { message: "Sync network error. Will retry on next load.", type: "error" }
              });
            }

            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents: localState.agents, conversations: migratedConversations }
            });
          } else {
            console.log("[AppProvider] No migration needed. Hydrating with API data.");
            const mergedAgents = [...agents];
            const agentIds = new Set(mergedAgents.map(a => a.id));
            const { DEFAULT_AGENTS } = await import("../data/defaultAgents");

            DEFAULT_AGENTS.forEach(da => {
              if (!agentIds.has(da.id)) {
                mergedAgents.push(da);
              }
            });

            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents: mergedAgents, conversations }
            });
          }
        } catch (err) {
          console.error("[AppProvider] Failed to sync with API", err);
          dispatch({ type: "HYDRATE_APP", payload: initialAppState });
        }
      } else if (status === "unauthenticated") {
        console.log("[AppProvider] Unauthenticated. Using localStorage if available.");
        if (localState) {
          // Handle old format migration for unauthenticated users too
          let conversations = localState.conversations || [];
          if (localState.spaces && localState.spaces.length > 0 && conversations.length === 0) {
            for (const space of localState.spaces) {
              for (const conv of space.conversations || []) {
                conversations.push({
                  ...conv,
                  participantIds: space.agentIds || [],
                });
              }
            }
          }
          // Merge local agents with default agents to ensure built-in agents are always present
          const mergedAgents = [...localState.agents || []];
          const defaultAgentIds = new Set(mergedAgents.map(a => a.id));

          import("../data/defaultAgents").then(({ DEFAULT_AGENTS }) => {
            DEFAULT_AGENTS.forEach(da => {
              if (!defaultAgentIds.has(da.id)) {
                mergedAgents.push(da);
              }
            });
          });

          console.log(`[AppProvider] Hydrating with local data: ${conversations.length} conversations, ${mergedAgents.length} agents`);
          dispatch({ type: "HYDRATE_APP", payload: { ...initialAppState, agents: mergedAgents, conversations } });
        } else {
          console.log("[AppProvider] No local data. Using initial state.");
          dispatch({ type: "HYDRATE_APP", payload: initialAppState });
        }
      }
    };

    if (status !== "loading") {
      syncData();
    }
  }, [status, session?.user?.id]);

  // Persist state changes
  useEffect(() => {
    if (!state._hydrated) return;

    if (status === "authenticated" && session?.user?.id) {
      // Debounce API calls
      const timer = setTimeout(async () => {
        console.log("[AppProvider] Auto-syncing state to API...");
        try {
          const [agRes, convRes] = await Promise.all([
            fetch("/api/agents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(state.agents),
            }),
            fetch("/api/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(state.conversations),
            }),
          ]);
          if (agRes.ok && convRes.ok) {
            console.log("[AppProvider] Auto-sync successful.");
          } else {
            console.error("[AppProvider] Auto-sync failed:", agRes.status, convRes.status);
          }
        } catch (err) {
          console.error("[AppProvider] Failed to auto-sync to API", err);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      localStorage.setItem("appState", JSON.stringify(state));
    }
  }, [state, status, session?.user?.id]);

  const contextValue = React.useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for easier consumption
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
