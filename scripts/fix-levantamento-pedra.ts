import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.demand.updateMany({
    where: { title: { contains: "Levantamento de Escopo", mode: "insensitive" } },
    data: { isPedra: true },
  });
  console.log(`✓ isPedra=true em ${result.count} demanda(s) de Levantamento de Escopo`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
