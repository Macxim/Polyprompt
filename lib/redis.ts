import { createClient } from 'redis';

const redisUrl = process.env.polypr0mpt_REDIS_URL;

if (!redisUrl && process.env.NODE_ENV === 'production') {
  console.error("CRITICAL: polypr0mpt_REDIS_URL is missing!");
}

// Create singleton client
const globalForRedis = global as unknown as { redisClient: ReturnType<typeof createClient> | undefined };

export const redis = globalForRedis.redisClient ?? createClient({
  url: redisUrl
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}

// Ensure connection
if (!redis.isOpen) {
  redis.connect().catch(err => {
    console.error('Redis Connection Error:', err);
  });
}

redis.on('error', (err) => console.error('Redis Client Error:', err));

export const ensureConnection = async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
};

// Key helpers
export const keys = {
  agents: (userId: string) => `user:${userId}:agents`,
  spaces: (userId: string) => `user:${userId}:spaces`,
  settings: (userId: string) => `user:${userId}:settings`,
  systemSpend: 'system:openai:spend',
  userDailyMessages: (userId: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `user:${userId}:messages:${today}`;
  },
};

// Data helpers
export const getUserData = async <T>(key: string): Promise<T[]> => {
  try {
    await ensureConnection();
    const data = await redis.get(key);
    if (!data) return [];
    return JSON.parse(data) as T[];
  } catch (error) {
    console.error(`Error getting user data for key ${key}:`, error);
    return [];
  }
};

export const setUserData = async <T>(key: string, data: T[]): Promise<void> => {
  try {
    await ensureConnection();
    await redis.set(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error setting user data for key ${key}:`, error);
    throw error;
  }
};

export default redis;
