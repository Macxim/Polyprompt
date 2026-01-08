import { redis } from "@/lib/redis";

const RATE_LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds
const MAX_REQUESTS = 3;

export async function checkRateLimit(identifier: string): Promise<{ success: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  const key = `ratelimit:${identifier}:${today}`;

  try {
    const current = await redis.incr(key);

    // Set expiry if it's the first request
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    return {
      success: current <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - current)
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Allow request in case of Redis failure to avoid blocking users
    return { success: true, remaining: 1 };
  }
}
