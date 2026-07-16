import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt({ token, user, account }: any) {
      if (user) {
        token.id                  = user.id;
        token.role                = user.role;
        token.isActive            = user.isActive;
        token.workerProfile       = user.workerProfile ?? null;
        token.forcePasswordChange = user.forcePasswordChange ?? false;
        // Armazena o provider usado no login para detectar conflito com useEntraId
        token.authProvider        = account?.provider ?? "credentials";
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: any) {
      session.user.id                  = token.id;
      session.user.role                = token.role;
      session.user.isActive            = token.isActive;
      session.user.workerProfile       = token.workerProfile;
      session.user.forcePasswordChange = token.forcePasswordChange;
      session.user.authProvider        = token.authProvider;
      return session;
    },
  },
  providers: [],
};
