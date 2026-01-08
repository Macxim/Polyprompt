import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
})

export const config = {
  matcher: [
    // Exclude auth, apis, static files, root (empty path/end), and conversation routes
    "/((?!$|auth|api/auth|api/register|share|api/share|api/chat|api/debate-plan|conversation|_next|favicon.ico|robots.txt).*)",
  ],
}
