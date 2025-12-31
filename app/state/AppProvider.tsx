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
        // 2. Fetch from API
        try {
          const [agentsRes, spacesRes] = await Promise.all([
            fetch("/api/agents"),
            fetch("/api/spaces"),
          ]);

          if (!agentsRes.ok || !spacesRes.ok) {
            console.error("API response error:", agentsRes.status, spacesRes.status);
            // Hydrate with empty/default if API fails, so UI doesn't hang
            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents: initialAppState.agents, spaces: [] }
            });
            return;
          }

          // ... existing code ...
          const agents = await agentsRes.json();
          const spaces = await spacesRes.json();

          // 3. Migration logic
          if (localState && (localState.agents.length > 0 || localState.spaces.length > 0)) {
            // Push local data to API
            try {
                await Promise.all([
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
            } catch (e) {
                console.error("Migration failed", e);
            }

            // Clear local storage after successful migration (or attempt)
            localStorage.removeItem("appState");

            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents: localState.agents, spaces: localState.spaces }
            });
          } else {
            dispatch({
              type: "HYDRATE_APP",
              payload: { ...initialAppState, agents, spaces }
            });
          }
        } catch (err) {
          console.error("Failed to sync with API", err);
          // Fallback to initial state so app doesn't hang
          dispatch({ type: "HYDRATE_APP", payload: initialAppState });
        }
      } else if (status === "unauthenticated") {
        // 4. Fallback to localStorage if not logged in (or first visit)
        if (localState) {
          dispatch({ type: "HYDRATE_APP", payload: localState });
        } else {
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
        try {
          await Promise.all([
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
        } catch (err) {
          console.error("Failed to auto-sync to API", err);
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
