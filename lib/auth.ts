import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { redis } from "@/lib/redis"

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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase()
        const userId = await redis.get(`user:email:${email}`) as string

        if (!userId) {
          return null
        }

        const user = await redis.get(`user:${userId}`) as string
        if (!user) {
          return null
        }

        const validUserData = JSON.parse(user)

        // If user was created via Google, they might not have a password
        if (!validUserData.password) {
            return null
        }

        const isValid = await compare(credentials.password, validUserData.password)

        if (!isValid) {
          return null
        }

        return {
          id: validUserData.id,
          name: validUserData.name,
          email: validUserData.email,
          image: validUserData.image,
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
