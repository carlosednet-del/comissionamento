import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/validations/auth";

/** Verifica credenciais contra a API do Supabase Auth (usuários legados sem passwordHash). */
async function verifySupabaseCredentials(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

const microsoftProvider = process.env.AUTH_MICROSOFT_ENTRA_ID_ID
  ? [
      MicrosoftEntraID({
        clientId:     process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
        issuer:       process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
        allowDangerousEmailAccountLinking: true,
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id:                  true,
            name:                true,
            email:               true,
            role:                true,
            isActive:            true,
            workerProfile:       true,
            forcePasswordChange: true,
            passwordHash:        true,
            useEntraId:          true,
          },
        });

        if (!user || !user.isActive) return null;

        // Bloqueia login por e-mail/senha para usuários com Entra ID ativo
        if (user.useEntraId) return null;

        let valid = false;

        if (user.passwordHash) {
          valid = await bcrypt.compare(password, user.passwordHash);
        } else {
          // Usuário legado Supabase: verifica via API e migra para bcrypt
          valid = await verifySupabaseCredentials(email, password);
          if (valid) {
            const hash = await bcrypt.hash(password, 12);
            await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
          }
        }

        if (!valid) return null;

        return {
          id:                  user.id,
          name:                user.name,
          email:               user.email,
          role:                user.role,
          isActive:            user.isActive,
          workerProfile:       user.workerProfile,
          forcePasswordChange: user.forcePasswordChange,
        };
      },
    }),
    ...microsoftProvider,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Para login OAuth (Microsoft), verifica se o usuário está cadastrado no sistema
      if (account?.provider !== "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, isActive: true, role: true, workerProfile: true, forcePasswordChange: true },
        });
        if (!dbUser || !dbUser.isActive) return "/sem-perfil";

        // Injeta dados do DB no user para o JWT callback capturar
        user.id                  = dbUser.id;
        user.role                = dbUser.role;
        user.isActive            = dbUser.isActive;
        user.workerProfile       = dbUser.workerProfile;
        user.forcePasswordChange = false; // OAuth dispensa troca de senha
      }
      return true;
    },
  },
});
