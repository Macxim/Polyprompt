import { createClient } from 'redis';

const globalForRedis = global as unknown as { redis: any };

export const redis = globalForRedis.redis || createClient({
  url: process.env.polypr0mpt_REDIS_URL,
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

if (!redis.isOpen) {
  redis.connect().catch(console.error);
}

// Key helpers
export const keys = {
  agents: (userId: string) => `user:${userId}:agents`,
  spaces: (userId: string) => `user:${userId}:spaces`,
  settings: (userId: string) => `user:${userId}:settings`,
};

// Data helpers
export const getUserData = async <T>(key: string): Promise<T[]> => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : [];
};

export const setUserData = async <T>(key: string, data: T[]): Promise<void> => {
  await redis.set(key, JSON.stringify(data));
};

export default redis;
