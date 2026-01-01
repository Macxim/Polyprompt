import { NextResponse } from 'next/server';
import { redis, ensureConnection } from '@/lib/redis';

/**
 * Example Route Handler for Redis (Vercel KV)
 * This demonstrates how to set and get values.
 */
export async function GET() {
  try {
    await ensureConnection();
    // 1. Sanity check: Ping
    const pong = await redis.ping();

    // 2. Set a value
    await redis.set('test_key', `Hello from Redis at ${new Date().toISOString()}`);

    // 3. Fetch the value
    const result = await redis.get('test_key');

    return NextResponse.json({
      success: true,
      ping: pong,
      result,
      status: 'Upstash Redis is responding'
    });
  } catch (error: any) {
    console.error('Redis Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Example from your snippet
    const id = "item";
    const result = await redis.get(id);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
