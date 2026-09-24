import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const hudson = await prisma.user.findFirst({
    where: { name: { contains: "Hudson", mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  if (!hudson) { console.log("Hudson não encontrado"); return; }
  console.log(`Hudson: ${hudson.id} — ${hudson.name} (${hudson.email})`);

  const stmts = await prisma.developerMonthlyStatement.findMany({
    where: { developerId: hudson.id },
    select: {
      id: true, periodMonth: true, periodYear: true,
      status: true, signedAt: true, totalEstimatedValue: true,
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
  console.log(`\nExtratos: ${stmts.length}`);
  for (const s of stmts) {
    console.log(`  ${s.periodYear}-${String(s.periodMonth).padStart(2,"0")} | ${s.status} | R$${s.totalEstimatedValue} | signed: ${s.signedAt?.toISOString().slice(0,10) ?? "null"} | id: ${s.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
