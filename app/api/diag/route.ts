import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keys, redis, ensureConnection } from "@/lib/redis";

export async function GET() {
  const session = await getServerSession(authOptions);

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    } : null,
    env: {
      polypr0mpt_REDIS_URL: process.env.polypr0mpt_REDIS_URL ? 'PRESENT' : 'MISSING',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    },
    redisTest: {}
  };

  try {
    // Wait for connection if if not ready
    if (!redis.isOpen) {
      await redis.connect();
    }

    // Test write
    const testKey = `diag:test:${Date.now()}`;
    await redis.set(testKey, JSON.stringify({ success: true }), { EX: 60 });
    diagnostics.redisTest.write = 'SUCCESS';

    // Test read
    const result = await redis.get(testKey);
    diagnostics.redisTest.read = 'SUCCESS';
    diagnostics.redisTest.result = result ? JSON.parse(result) : null;

    // Check budget spend
    const spend = await redis.get(keys.systemSpend);
    diagnostics.openaiBudget = {
      limit: 30.0,
      current: parseFloat(spend || "0"),
      status: parseFloat(spend || "0") >= 30.0 ? "EXCEEDED" : "OK"
    };

    // --- NEW: USER DATA INSPECTION ---
    if (session?.user?.id) {
      const userId = session.user.id;
      const agentsKey = keys.agents(userId);

      const rawAgents = await redis.get(agentsKey);

      diagnostics.userData = {
        agentsKey,
        agentsRaw: rawAgents ? (rawAgents.substring(0, 100) + "...") : "MISSING",
        agentsParsed: rawAgents ? JSON.parse(rawAgents).length : 0,
      };

      diagnostics.migrationSummary = {
        status: (diagnostics.userData.agentsParsed > 0) ? "SYNCED" : "PENDING_OR_EMPTY",
        advice: (diagnostics.userData.agentsParsed === 0)
          ? "Data exists only in LocalStorage. Check Browser Console [AppProvider] logs."
          : "Data is successfully in Redis."
      };
    }
    // --------------------------------

  } catch (error: any) {
    diagnostics.redisTest.status = 'FAILED';
    diagnostics.redisTest.error = error.message;
    diagnostics.redisTest.stack = error.stack;
  }

  return NextResponse.json(diagnostics);
}
