-- CreateTable
CREATE TABLE "auth_provider_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "useEntraId" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_provider_config_pkey" PRIMARY KEY ("id")
);

-- Seed: garante a linha única com valor padrão
INSERT INTO "auth_provider_config" ("id", "useEntraId", "updatedAt")
VALUES (1, false, NOW())
ON CONFLICT ("id") DO NOTHING;
