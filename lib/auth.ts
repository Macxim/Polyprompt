import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { redis, ensureConnection } from "@/lib/redis"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const email = credentials.email.toLowerCase()
          console.log(`[Auth] Attempting login for email: ${email}`);

          await ensureConnection();
          const userId = await redis.get(`user:email:${email}`) as string
          console.log(`[Auth] Redis userId lookup result: ${userId ? 'found' : 'not found'}`);

          if (!userId) {
            return null
          }

          const user = await redis.get(`user:${userId}`) as string
          if (!user) {
            console.log(`[Auth] User data not found for userId: ${userId}`);
            return null
          }

          // Upstash redis might return an object directly if it was stored as one,
          // but our code seems to treat it as a string that needs parsing.
          // Let's handle both.
          let validUserData;
          try {
            validUserData = typeof user === 'string' ? JSON.parse(user) : user;
          } catch (e) {
            console.error(`[Auth] Error parsing user data:`, e);
            return null;
          }

          // If user was created via Google, they might not have a password
          if (!validUserData.password) {
            console.log(`[Auth] User has no password (likely OAuth user)`);
            return null
          }

          const isValid = await compare(credentials.password, validUserData.password)
          console.log(`[Auth] Password validation result: ${isValid}`);

          if (!isValid) {
            return null
          }

          return {
            id: validUserData.id,
            name: validUserData.name,
            email: validUserData.email,
            image: validUserData.image,
          }
        } catch (error) {
          console.error(`[Auth] Authorize error:`, error);
          throw error;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && profile) {
        token.id = profile.sub as string
      } else if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
