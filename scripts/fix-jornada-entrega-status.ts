import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.demand.findFirst({
    where: { title: { contains: "Jornada do Cliente — Entrega assistida", mode: "insensitive" } },
    select: { id: true, title: true, status: true },
  });
  if (!d) { console.log("não encontrada"); return; }

  await prisma.demand.update({
    where: { id: d.id },
    data: {
      status:            "EM_DESENVOLVIMENTO",
      actualDeliveryDate: null,
    },
  });
  console.log(`✓ [${d.id.slice(-6).toUpperCase()}] ${d.title}`);
  console.log(`  status: HOMOLOGADA_PRODUCAO → EM_DESENVOLVIMENTO`);
  console.log(`  actualDeliveryDate → null`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
