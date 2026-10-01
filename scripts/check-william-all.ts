import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: "William", mode: "insensitive" } },
    select: { id: true, name: true, role: true, isActive: true },
  });
  console.log("Usuários William encontrados:", users.length);
  for (const u of users) {
    console.log(`  ${u.name} | ${u.role} | ativo:${u.isActive} | ${u.id}`);

    const demands = await prisma.demand.findMany({
      where: { assigneeId: u.id },
      select: {
        id: true, title: true, status: true,
        homologationDate: true, actualDeliveryDate: true, plannedDeliveryDate: true,
        estimatedDemandValue: true,
      },
      orderBy: { homologationDate: "desc" },
    });
    console.log(`  Total demandas: ${demands.length}`);
    for (const d of demands) {
      const hm = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
      const ad = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
      const val = d.estimatedDemandValue?.toFixed(2) ?? "—";
      console.log(`    [${d.id.slice(-6).toUpperCase()}] ${d.status.padEnd(25)} homolog:${hm} | actual:${ad} | R$${val}`);
      console.log(`      ${d.title.slice(0, 70)}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
