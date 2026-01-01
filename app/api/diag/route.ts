import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'PRESENT' : 'MISSING',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'PRESENT' : 'MISSING',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    },
    redisTest: {}
  };

  try {
    // Test write
    const testKey = `diag:test:${Date.now()}`;
    await redis.set(testKey, { success: true }, { ex: 60 });
    diagnostics.redisTest.write = 'SUCCESS';

    // Test read
    const result = await redis.get(testKey);
    diagnostics.redisTest.read = 'SUCCESS';
    diagnostics.redisTest.result = result;

  } catch (error: any) {
    diagnostics.redisTest.status = 'FAILED';
    diagnostics.redisTest.error = error.message;
    diagnostics.redisTest.stack = error.stack;
  }

  return NextResponse.json(diagnostics);
}
