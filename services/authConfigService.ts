import { prisma } from "@/lib/prisma";

export type AuthProviderConfig = {
  useEntraId: boolean;
};

async function getConfig(): Promise<AuthProviderConfig> {
  const row = await prisma.authProviderConfig.findUnique({ where: { id: 1 } });
  return { useEntraId: row?.useEntraId ?? false };
}

async function setUseEntraId(useEntraId: boolean): Promise<AuthProviderConfig> {
  await prisma.authProviderConfig.upsert({
    where:  { id: 1 },
    update: { useEntraId },
    create: { id: 1, useEntraId },
  });
  return { useEntraId };
}

export const authConfigService = { getConfig, setUseEntraId };
