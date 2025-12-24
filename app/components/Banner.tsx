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
    <div className="px-8 max-w-4xl mx-auto">
      <div
        role="status"
        className={`mb-4 border rounded-lg flex justify-between items-start shadow-sm mx-4 mt-4 max-w-${maxWidth} lg:mx-auto px-4 py-3 ${
          isError
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        <span>{state.ui.bannerMessage.message}</span>
        <button
          onClick={() =>
            dispatch({ type: "SET_BANNER", payload: { message: null } })
          }
          className={`ml-4 font-semibold ${
            isError ? "text-red-700 hover:text-red-900" : "text-green-700 hover:text-green-900"
          }`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
