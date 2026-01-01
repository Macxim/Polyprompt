import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /auth (sign in page)
     * - /api/auth (auth API)
     * - /share (public sharing links)
     * - /api/share (public sharing API)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt (static files)
     */
    "/((?!auth|api/auth|api/register|share|api/share|_next|favicon.ico|robots.txt).*)",
  ],
}
