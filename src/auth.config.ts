import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Edge-safe config used by middleware (no Prisma, no bcrypt).
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    // OAuth (Google/GitHub) removed until real credentials are configured —
    // instantiating them with blank client IDs breaks all Auth.js routes.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Real authorize() lives in auth.ts (Node runtime with Prisma + bcrypt).
      authorize: async () => null,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/app") ||
        nextUrl.pathname.startsWith("/dashboard");
      if (isProtected) return isLoggedIn;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role ?? "EMPLOYEE";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
