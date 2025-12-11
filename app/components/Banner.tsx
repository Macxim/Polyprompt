"use client";

import { useApp } from "../state/AppProvider";

type BannerProps = {
  maxWidth?: "3xl" | "4xl" | "6xl";
};

export default function Banner({ maxWidth = "4xl" }: BannerProps) {
  const { state, dispatch } = useApp();

  if (!state.ui.bannerMessage?.message) return null;

  return (
    <div className="px-8 max-w-4xl mx-auto">
      <div
        role="status"
        className={`mb-4 border border-green-200 bg-green-50 text-green-800 px-4 py-3 rounded-lg flex justify-between items-start shadow-sm mx-4 mt-4 max-w-${maxWidth} lg:mx-auto`}
      >
        <span>{state.ui.bannerMessage.message}</span>
        <button
          onClick={() =>
            dispatch({ type: "SET_BANNER", payload: { message: null } })
          }
          className="ml-4 text-green-700 hover:text-green-900 font-semibold"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
