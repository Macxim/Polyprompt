"use client";

import { useApp } from "../state/AppProvider";

type BannerProps = {
  maxWidth?: "3xl" | "4xl" | "6xl";
};

export default function Banner({ maxWidth = "4xl" }: BannerProps) {
  const { state, dispatch } = useApp();

  if (!state.ui.bannerMessage?.message) return null;

  const isError = state.ui.bannerMessage.type === "error";

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        role="status"
        className={`border rounded-2xl flex justify-between items-start shadow-lg backdrop-blur-sm px-5 py-4 ${
          isError
            ? "border-red-200 bg-red-50/95 text-red-800"
            : "border-green-200 bg-green-50/95 text-green-800"
        }`}
      >
        <span className="font-medium">{state.ui.bannerMessage.message}</span>
        <button
          onClick={() =>
            dispatch({ type: "SET_BANNER", payload: { message: null } })
          }
          className={`ml-4 font-bold text-sm hover:scale-110 transition-transform ${
            isError ? "text-red-700 hover:text-red-900" : "text-green-700 hover:text-green-900"
          }`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
