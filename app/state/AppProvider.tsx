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

// Define the shape of the context
type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialAppState);

  // Hydrate state from localStorage once on mount
  useEffect(() => {
    const savedState = localStorage.getItem("appState");
    if (savedState) {
      try {
        const parsedState: AppState = JSON.parse(savedState);
        dispatch({ type: "HYDRATE_APP", payload: parsedState });
      } catch (err) {
        console.error("Failed to parse saved app state", err);
      }
    }
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    // Avoid saving the initial empty state before HYDRATE
    if (state._hydrated) {
      localStorage.setItem("appState", JSON.stringify(state));
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
