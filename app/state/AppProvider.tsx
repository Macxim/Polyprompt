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
      let localState: AppState | null = null;
      if (savedState) {
        try {
          localState = JSON.parse(savedState);
        } catch (err) {
          console.error("Failed to parse local app state", err);
        }
      }

      if (status === "authenticated" && session?.user?.id) {
        console.log("[AppProvider] Authenticated. Fetching from API...");
        // 2. Fetch from API
        try {
          const [agentsRes, spacesRes] = await Promise.all([
            fetch("/api/agents"),
            fetch("/api/spaces"),
          ]);

          if (!agentsRes.ok || !spacesRes.ok) {
            console.error("[AppProvider] API response error:", agentsRes.status, spacesRes.status);
            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents: initialAppState.agents, spaces: [] }
            });
            return;
          }

          const agents = await agentsRes.json();
          const spaces = await spacesRes.json();
          console.log(`[AppProvider] API data: ${agents.length} agents, ${spaces.length} spaces`);

          // 3. Migration logic
          // Only migrate if there are spaces OR if the local agents are different from default (more than 8)
          const hasLocalData = localState && (localState.spaces.length > 0 || localState.agents.length > 8);
          console.log("[AppProvider] Checking migration. Has local data?", !!hasLocalData);

          if (localState && hasLocalData) {
            console.log("[AppProvider] Starting migration to Redis...");
            try {
                const [agRes, spRes] = await Promise.all([
                  fetch("/api/agents", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(localState.agents),
                  }),
                  fetch("/api/spaces", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(localState.spaces),
                  }),
                ]);

                if (agRes.ok && spRes.ok) {
                  console.log("[AppProvider] Migration successful. Clearing local cache.");
                  localStorage.removeItem("appState");
                } else {
                  console.error("[AppProvider] Migration server error:", agRes.status, spRes.status);
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
              payload: { ...initialAppState, agents: localState.agents, spaces: localState.spaces }
            });
          } else {
            console.log("[AppProvider] No migration needed. Hydrating with API data.");
            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents, spaces }
            });
          }
        } catch (err) {
          console.error("[AppProvider] Failed to sync with API", err);
          dispatch({ type: "HYDRATE_APP", payload: initialAppState });
        }
      } else if (status === "unauthenticated") {
        console.log("[AppProvider] Unauthenticated. Using localStorage if available.");
        // 4. Fallback to localStorage if not logged in (or first visit)
        if (localState) {
          console.log(`[AppProvider] Hydrating with local data: ${localState.spaces.length} spaces`);
          dispatch({ type: "HYDRATE_APP", payload: localState });
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
          const [agRes, spRes] = await Promise.all([
            fetch("/api/agents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(state.agents),
            }),
            fetch("/api/spaces", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(state.spaces),
            }),
          ]);
          if (agRes.ok && spRes.ok) {
            console.log("[AppProvider] Auto-sync successful.");
          } else {
            console.error("[AppProvider] Auto-sync failed:", agRes.status, spRes.status);
          }
        } catch (err) {
          console.error("[AppProvider] Failed to auto-sync to API", err);
        }
      }, 1000); // 1 second debounce

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
