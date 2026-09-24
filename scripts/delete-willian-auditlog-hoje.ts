import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const inicio = new Date("2026-08-20T00:00:00.000Z");
  const fim    = new Date("2026-08-20T23:59:59.999Z");

  // Conta antes
  const total = await prisma.auditLog.count({ where: { createdAt: { gte: inicio, lte: fim } } });
  console.log(`Audit logs de hoje (20/08/2026): ${total}`);

  if (total === 0) { console.log("Nada a apagar."); return; }

  const deleted = await prisma.auditLog.deleteMany({
    where: { createdAt: { gte: inicio, lte: fim } },
  });
  console.log(`✓ ${deleted.count} registros apagados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
