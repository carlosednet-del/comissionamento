import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demands = await prisma.demand.findMany({
    where: { title: { contains: "Padronização da Infraestrutura", mode: "insensitive" } },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  console.log(`Encontradas: ${demands.length}`);
  for (const d of demands) {
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.status} | ${d.createdAt.toISOString().slice(0,10)} | ${d.title}`);
  }

  if (demands.length === 0) { console.log("Nenhuma encontrada."); return; }
  if (demands.length > 1) { console.log("Mais de uma encontrada — abortando."); return; }

  const d = demands[0];

  // Deletar evidências relacionadas primeiro
  const evDel = await prisma.demandEvidence.deleteMany({ where: { demandId: d.id } });
  console.log(`\nEvidências deletadas: ${evDel.count}`);

  // Deletar items de extrato relacionados
  const siDel = await prisma.developerMonthlyStatementItem.deleteMany({ where: { demandId: d.id } });
  console.log(`Statement items deletados: ${siDel.count}`);

  // Deletar a demanda
  await prisma.demand.delete({ where: { id: d.id } });
  console.log(`\n✓ Demanda [${d.id.slice(-6).toUpperCase()}] "${d.title}" excluída.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
