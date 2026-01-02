import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { redis, ensureConnection } from "@/lib/redis"
import { v4 as uuidv4 } from "uuid"
import posthog from "@/lib/posthog"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase()

    await ensureConnection()

    // Check if user exists
    const existingUserId = await redis.get(`user:email:${normalizedEmail}`)
    if (existingUserId) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      )
    }

    const hashedPassword = await hash(password, 12)
    const userId = uuidv4()

    const newUser = {
      id: userId,
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store user data
    await redis.set(`user:${userId}`, JSON.stringify(newUser))

    // Create email mapping
    await redis.set(`user:email:${normalizedEmail}`, userId)

    // Track sign up
    posthog.capture({
      distinctId: userId,
      event: 'user_signed_up',
      properties: {
        email: normalizedEmail,
        name: newUser.name
      }
    })

    // In serverless, we flush to ensure capture
    await posthog.shutdown()

    // Return success (excluding password)
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(
      { user: userWithoutPassword, message: "User created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
