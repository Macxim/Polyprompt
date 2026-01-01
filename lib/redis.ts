import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key helpers
export const keys = {
  agents: (userId: string) => `user:${userId}:agents`,
  spaces: (userId: string) => `user:${userId}:spaces`,
  settings: (userId: string) => `user:${userId}:settings`,
};

// Data helpers
export const getUserData = async <T>(key: string): Promise<T[]> => {
  const data = await redis.get(key);
  if (!data) return [];
  return typeof data === 'string' ? JSON.parse(data) : data as T[];
};

export const setUserData = async <T>(key: string, data: T[]): Promise<void> => {
  await redis.set(key, JSON.stringify(data));
};

export default redis;
