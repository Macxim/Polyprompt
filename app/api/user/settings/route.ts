import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redis, keys, ensureConnection } from "@/lib/redis"
import { encrypt } from "@/lib/crypto"
import { hasUserApiKey } from "@/lib/get-api-key"

const ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET

export async function GET() {
  await ensureConnection();
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const hasKey = await hasUserApiKey(session.user.id, session.user.email || undefined)

  let remainingMessages = null;
  if (!hasKey) {
    const dailyKey = keys.userDailyMessages(session.user.id);
    const currentCountStr = await redis.get(dailyKey);
    const currentCount = parseInt(currentCountStr || "0", 10);
    remainingMessages = Math.max(0, 3 - currentCount); // 3 is the DAILY_MESSAGE_LIMIT
  }

  return NextResponse.json({
    hasApiKey: hasKey,
    remainingMessages
  })
}

export async function POST(req: NextRequest) {
  await ensureConnection();
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!ENCRYPTION_SECRET) {
    console.error("API_KEY_ENCRYPTION_SECRET is not defined")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  try {
    const { openaiKey } = await req.json()

    if (!openaiKey || !openaiKey.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 400 })
    }

    const encryptedKey = encrypt(openaiKey, ENCRYPTION_SECRET)
    const userId = session.user.id
    const key = keys.settings(userId)

    const currentData = await redis.get(key)
    const settings = (typeof currentData === 'string' ? JSON.parse(currentData) : currentData) || {}

    settings.openaiKey = encryptedKey
    settings.updatedAt = Date.now()

    await redis.set(key, JSON.stringify(settings))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving API key:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}

export async function DELETE() {
  await ensureConnection();
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id
    const key = keys.settings(userId)

    const currentData = await redis.get(key)
    if (currentData) {
      const settings = typeof currentData === 'string' ? JSON.parse(currentData) : currentData
      delete settings.openaiKey
      settings.updatedAt = Date.now()
      await redis.set(key, JSON.stringify(settings))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
  }
}
