import type { UserRole, WorkerProfile } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    isActive?: boolean;
    workerProfile?: WorkerProfile | null;
    forcePasswordChange?: boolean;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      isActive: boolean;
      workerProfile: WorkerProfile | null;
      forcePasswordChange: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isActive: boolean;
    workerProfile: WorkerProfile | null;
    forcePasswordChange: boolean;
  }
}
