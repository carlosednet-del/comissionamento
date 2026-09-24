import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }
  console.log(`Usuário: ${luiz.name} (${luiz.id})`);

  // Verifica se já existe periodMonth=7
  const existing7 = await prisma.developerMonthlyStatement.findFirst({
    where: { developerId: luiz.id, periodMonth: 7, periodYear: 2026 },
    select: { id: true, status: true, signedAt: true },
  });
  if (existing7) {
    console.log(`periodMonth=7 já existe: ${existing7.status} | signed: ${existing7.signedAt?.toISOString().slice(0,10)}`);
    return;
  }

  // Statement com periodMonth=6 assinado em julho
  const stmt6 = await prisma.developerMonthlyStatement.findFirst({
    where: { developerId: luiz.id, periodMonth: 6, periodYear: 2026 },
    select: { id: true, status: true, signedAt: true, totalEstimatedValue: true, _count: { select: { items: true } } },
  });
  if (!stmt6) { console.log("periodMonth=6 não encontrado"); return; }

  console.log(`periodMonth=6 encontrado: ${stmt6.status} | signed: ${stmt6.signedAt?.toISOString().slice(0,10)} | items: ${stmt6._count.items}`);

  // Corrige: era o extrato de julho armazenado com mês errado
  await prisma.developerMonthlyStatement.update({
    where: { id: stmt6.id },
    data: { periodMonth: 7 },
  });

  console.log(`✓ periodMonth corrigido 6 → 7`);
  console.log(`  Extrato de julho agora aparece como ${stmt6.status} no DAP`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
