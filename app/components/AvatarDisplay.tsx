"use client";
import { Agent } from "../types";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type Props = {
  agent: Pick<Agent, "id" | "name" | "avatar">;
  size?: AvatarSize;
  className?: string;
};

// Generate a consistent color gradient based on agent name
const generateGradient = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-pink-500 to-rose-500",
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-green-500 to-emerald-500",
    "from-yellow-500 to-orange-500",
    "from-red-500 to-pink-500",
    "from-indigo-500 to-purple-500",
    "from-cyan-500 to-blue-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-fuchsia-500 to-pink-500",
    "from-violet-500 to-purple-500",
  ];
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const sizeClasses = {
  sm: "w-5 h-5 text-[10px]",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
  xl: "w-16 h-16 text-2xl",
};

export default function AvatarDisplay({ agent, size = "md", className = "" }: Props) {
  const gradient = generateGradient(agent.name);
  const sizeClass = sizeClasses[size];
  const initial = agent.name[0]?.toUpperCase() || "A";

  // Check if avatar is an emoji (single character or emoji)
  const isEmoji = agent.avatar && agent.avatar.length <= 2;

  // Check if avatar is a URL
  const isImageUrl = agent.avatar && (
    agent.avatar.startsWith("http://") ||
    agent.avatar.startsWith("https://") ||
    agent.avatar.startsWith("/")
  );

  if (isImageUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden ring-2 ring-white shadow-sm ${className}`}>
        <img
          src={agent.avatar!}
          alt={`${agent.name} avatar`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (isEmoji) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm ${className}`}
      >
        <span className="text-white">{agent.avatar}</span>
      </div>
    );
  }

  // Auto-generated gradient avatar with initial
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold uppercase shadow-sm ${className}`}
    >
      {initial}
    </div>
  );
}