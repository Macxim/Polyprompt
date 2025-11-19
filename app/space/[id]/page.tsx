"use client";

import Link from "next/link";
import { useSpaces } from "../../context/SpaceContext";
import { useParams, useRouter } from "next/navigation";

export default function SpacePage() {
  const { spaces } = useSpaces();
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const space = spaces.find((s) => s.id === spaceId);
  const { addConversation, addAgent, updateAgentPersona } = useSpaces();

  if (!space) {
    return (
      <div className="p-8">
        <p className="text-red-500">Space not found.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-3 underline text-blue-600"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{space.name}</h1>
      <p className="text-gray-600 mb-6">ID: {space.id}</p>

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold text-xl">
            Agents ({space.agents.length})
          </h2>
          <ul>
            {space.agents.map((agent) => (
              <li key={agent.id}>
                {agent.name}
                <input
                  className="ml-2"
                  type="text"
                  value={agent.persona}
                  onChange={(e) =>
                    updateAgentPersona(space.id, agent.id, e.target.value)
                  }
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold text-xl">
            Conversations ({space.conversations.length})
          </h2>
          <ul>
            {space.conversations.map((conv) => (
              <li key={conv.id}>
                <Link
                  key={space.id}
                  href={`/space/${space.id}/conversation/${conv.id}`}
                >
                  {conv.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center">
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => addConversation(space.id)}
        >
          Add Conversation
        </button>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => addAgent(space.id)}
        >
          Add Agent
        </button>
      </div>

      <div className="">
        <button
          className="mt-6 underline text-blue-600"
          onClick={() => router.push("/")}
        >
          Back to spaces
        </button>
      </div>
    </div>
  );
}
