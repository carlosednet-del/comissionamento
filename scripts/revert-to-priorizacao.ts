import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Os códigos visíveis (#BN60BI, #JEJA1X) são id.slice(-6).toUpperCase()
  const suffixes = ["bn60bi", "jeja1x"];

  for (const suffix of suffixes) {
    const demand = await prisma.demand.findFirst({
      where: { id: { endsWith: suffix } },
    });
    if (!demand) {
      console.log(`Demanda #${suffix.toUpperCase()} não encontrada.`);
      continue;
    }

    const updated = await prisma.demand.update({
      where: { id: demand.id },
      data: { status: "PRIORIZACAO_DIRETORIA" },
    });

    console.log(`✓ #${suffix.toUpperCase()} — "${updated.title}" → PRIORIZACAO_DIRETORIA`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
