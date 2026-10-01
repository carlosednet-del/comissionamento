import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SUFIXOS = [
  "OONTRD",
  "44WSF1",
  "ACCKRU",
  "UGWRCA",
  "S35LB",
  "LOXZQP",
  "99CMKP",
  "R11XOU",
  "IA240I",
  "PD2SX",
];

async function main() {
  for (const sufixo of SUFIXOS) {
    const demand = await prisma.demand.findFirst({
      where: { id: { endsWith: sufixo.toLowerCase() } },
      select: { id: true, title: true, status: true, evidences: { select: { id: true } }, statementItems: { select: { id: true } } },
    });

    if (!demand) {
      console.log(`[${sufixo}] não encontrada`);
      continue;
    }

    if (demand.evidences.length > 0 || demand.statementItems.length > 0) {
      console.log(`[${sufixo}] ATENÇÃO: possui ${demand.evidences.length} evidências e ${demand.statementItems.length} itens de extrato — pulando`);
      continue;
    }

    await prisma.demand.delete({ where: { id: demand.id } });
    console.log(`✓ [${sufixo}] apagada — ${demand.title.slice(0, 70)}`);
  }

  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
