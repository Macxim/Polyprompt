import { createClient } from 'redis';

const globalForRedis = global as unknown as { redis: any };

export const redis = globalForRedis.redis || createClient({
  url: process.env.polypr0mpt_REDIS_URL,
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

if (!redis.isOpen) {
  redis.connect().catch(console.error);
}

export default redis;
