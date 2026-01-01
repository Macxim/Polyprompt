import { redis, keys, ensureConnection } from "@/lib/redis";
import { decrypt } from "./crypto"

const ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET

export async function getApiKeyForUser(userId: string, email?: string): Promise<string | null> {
  await ensureConnection();
  const data = await redis.get(keys.settings(userId))
  let userKey: string | null = null

  if (data) {
    try {
      const settings = typeof data === 'string' ? JSON.parse(data) : (data as any)
      if (settings.openaiKey && ENCRYPTION_SECRET) {
        userKey = decrypt(settings.openaiKey, ENCRYPTION_SECRET)
      }
    } catch (error) {
      console.error("Error retrieving user API key:", error)
    }
  }

  // If user has their own key, use it
  if (userKey) return userKey

  // Admin Override: If user is an admin, they can use the system key
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase())
  const isAdmin = email && adminEmails.includes(email.toLowerCase())

  if (isAdmin && process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY
  }

  // No key available
  return null
}

export async function hasUserApiKey(userId: string, email?: string): Promise<boolean> {
  await ensureConnection();
  // Check if user is an admin
  if (email && process.env.OPENAI_API_KEY) {
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase())
    if (adminEmails.includes(email.toLowerCase())) {
      return true
    }
  }

  const data = await redis.get(keys.settings(userId))
  if (!data) return false

  try {
    const settings = typeof data === 'string' ? JSON.parse(data) : (data as any)
    return !!settings.openaiKey
  } catch {
    return false
  }
}
