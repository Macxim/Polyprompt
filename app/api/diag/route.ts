import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
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

  } catch (error: any) {
    diagnostics.redisTest.status = 'FAILED';
    diagnostics.redisTest.error = error.message;
    diagnostics.redisTest.stack = error.stack;
  }

  return NextResponse.json(diagnostics);
}
