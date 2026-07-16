-- Reconciliacao de baseline (NextAuth v5 + credenciais).
--
-- Estas mudancas (tabela `accounts` do PrismaAdapter e colunas de credenciais
-- em `users`) foram aplicadas via `prisma db push` no ambiente de TESTE antes
-- de existir uma migration versionada. Este script e IDEMPOTENTE de proposito:
--   - no banco de TESTE os objetos ja existem -> os `IF NOT EXISTS`/guarda pulam;
--   - no banco de PRODUCAO (sem esses objetos) -> cria tudo do zero.
-- Assim `prisma migrate deploy` roda com seguranca nos dois ambientes.

-- AlterTable: colunas novas em users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "image" TEXT,
ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- CreateTable: accounts (NextAuth PrismaAdapter)
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- AddForeignKey (guardado: pode ja existir no ambiente de teste)
DO $$ BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
