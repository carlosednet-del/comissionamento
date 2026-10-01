import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Restaurar estado original
const ORIGINAL: Record<string, { status: string; actualDeliveryDate: Date; homologationDate: null }> = {
  "PDYSCK": {
    status: "AGUARDANDO_HOMOLOGACAO",
    actualDeliveryDate: new Date("2026-09-17T12:00:00.000Z"),
    homologationDate: null,
  },
  "VF3PPZ": {
    status: "AGUARDANDO_HOMOLOGACAO",
    actualDeliveryDate: new Date("2026-09-16T12:00:00.000Z"),
    homologationDate: null,
  },
};

async function main() {
  for (const [sufixo, data] of Object.entries(ORIGINAL)) {
    const demand = await prisma.demand.findFirst({
      where: { id: { endsWith: sufixo.toLowerCase() } },
      select: { id: true, title: true },
    });
    if (!demand) { console.log(`${sufixo}: não encontrada`); continue; }

    await prisma.demand.update({
      where: { id: demand.id },
      data: {
        status:            data.status as any,
        actualDeliveryDate: data.actualDeliveryDate,
        homologationDate:  data.homologationDate,
      },
    });
    console.log(`✓ [${sufixo}] revertido → ${data.status} | actual:${data.actualDeliveryDate.toISOString().slice(0, 10)} | homolog:null`);
    console.log(`  ${demand.title}`);
  }
  console.log("\nReversão concluída ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
