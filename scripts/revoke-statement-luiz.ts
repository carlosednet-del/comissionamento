import { PrismaClient, StatementStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!luiz) { console.log("não encontrado"); return; }
  console.log(`Usuário: ${luiz.name} (${luiz.id})`);

  const statements = await prisma.developerMonthlyStatement.findMany({
    where: { developerId: luiz.id },
    select: {
      id: true, periodMonth: true, periodYear: true,
      status: true, signedAt: true, signedById: true,
      signatureCode: true, contentHash: true, signatureIp: true, signatureUserAgent: true,
      totalEstimatedValue: true,
      _count: { select: { items: true } },
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  console.log(`\nExtratos de ${luiz.name}:`);
  for (const s of statements) {
    console.log(`  ${s.periodYear}-${String(s.periodMonth).padStart(2,"0")} | ${s.status} | signed: ${s.signedAt?.toISOString().slice(0,10) ?? "null"} | items: ${s._count.items} | code: ${s.signatureCode ? "ok" : "null"} | id: ${s.id}`);
  }

  // Restaura julho (periodMonth=6) se estiver como PENDING
  const julho = statements.find(s => s.periodMonth === 6 && s.periodYear === 2026);
  if (!julho) { console.log("\nExtrato de julho não encontrado"); return; }

  if (julho.status === "PENDING") {
    console.log(`\nJulho está PENDING — restaurando para EXPORTED...`);
    await prisma.developerMonthlyStatement.update({
      where: { id: julho.id },
      data: {
        status:    "EXPORTED" as StatementStatus,
        signedAt:  new Date("2026-07-16T18:50:23.051Z"),
        signedById: luiz.id, // usa o próprio dev como fallback
      },
    });
    console.log(`✓ Extrato de julho restaurado para EXPORTED`);
  } else {
    console.log(`\nJulho já está ${julho.status} — nenhuma ação necessária`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
