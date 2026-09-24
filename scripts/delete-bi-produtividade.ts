import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demand = await prisma.demand.findFirst({
    where: { title: { contains: "Finalizar BI de Produtividade", mode: "insensitive" } },
    select: { id: true, title: true, status: true, assigneeId: true },
  });

  if (!demand) { console.log("Demanda não encontrada."); return; }

  console.log(`Encontrada: [${demand.id}] ${demand.title} | status: ${demand.status}`);

  // Remove audit logs primeiro (FK)
  const logs = await prisma.auditLog.deleteMany({ where: { entityId: demand.id } });
  console.log(`✓ ${logs.count} audit logs removidos`);

  // Remove a demanda
  await prisma.demand.delete({ where: { id: demand.id } });
  console.log(`✓ Demanda "${demand.title}" apagada do banco.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
