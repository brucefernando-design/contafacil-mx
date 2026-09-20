import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credenciales SAT",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(String(credentials.password), user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isDespacho: user.isDespacho,
          activeCompanyId: user.activeCompanyId || user.memberships[0]?.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.isDespacho = (user as unknown as { isDespacho: boolean }).isDespacho;
        token.activeCompanyId = (user as unknown as { activeCompanyId: string }).activeCompanyId;
      }
      if (trigger === "update" && session?.activeCompanyId) {
        token.activeCompanyId = session.activeCompanyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).isDespacho = token.isDespacho;
        (session.user as unknown as Record<string, unknown>).activeCompanyId = token.activeCompanyId;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "contafacil-mexico-sat-2026-super-secret-key-32chars",
});
