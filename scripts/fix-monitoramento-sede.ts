import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.demand.findFirst({
    where: { title: { contains: "Monitoramento e Indicadores de Infraestrutura", mode: "insensitive" } },
    select: { id: true, title: true },
  });
  if (!d) { console.log("não encontrada"); return; }
  console.log(`Encontrada: ${d.title}`);

  await prisma.demand.update({
    where: { id: d.id },
    data: {
      title:       "Monitoramento e Indicadores de Infraestrutura — Sede",
      description: "Definir e implantar indicadores essenciais de eficiência da infraestrutura e estoque da Sede, com metodologia simples, fonte de dados identificada e capacidade de acompanhamento mensal.",
    },
  });
  console.log(`✓ título → "Monitoramento e Indicadores de Infraestrutura — Sede"`);
  console.log(`✓ descrição atualizada com foco na Sede`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
