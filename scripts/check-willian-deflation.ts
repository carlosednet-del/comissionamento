import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Importa applyDeflator localmente para simular o cálculo
function applyDeflatorSimple(value: number, actual: Date | null, planned: Date | null) {
  if (!actual || !planned) return { deflatedValue: value, factor: 1 };
  if (actual <= planned) return { deflatedValue: value, factor: 1 };
  // working-days late (approx)
  const diffMs = actual.getTime() - planned.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { deflatedValue: value, factor: 1, daysLate: diffDays, NOTE: "deflation SHOULD apply" };
}

async function main() {
  const willian = await prisma.user.findFirst({
    where: { name: { contains: "Willian", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!willian) { console.log("Willian não encontrado"); return; }
  console.log(`Willian: ${willian.id}`);

  // Período de agosto (16/07 a 15/08)
  const gte = new Date("2026-07-16T00:00:00.000Z");
  const lte = new Date("2026-08-15T23:59:59.999Z");

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: willian.id,
      status: "HOMOLOGADA_PRODUCAO",
      actualDeliveryDate: { gte, lte },
    },
    select: {
      id: true, title: true,
      estimatedDemandValue: true,
      plannedDeliveryDate: true,
      actualDeliveryDate: true,
      homologationDate: true,
    },
    orderBy: { actualDeliveryDate: "asc" },
  });

  console.log(`\nDemandas no período agosto (${demands.length}):`);
  for (const d of demands) {
    const deflation = applyDeflatorSimple(
      d.estimatedDemandValue ?? 0,
      d.actualDeliveryDate,
      d.plannedDeliveryDate,
    );
    const late = d.actualDeliveryDate && d.plannedDeliveryDate
      ? d.actualDeliveryDate > d.plannedDeliveryDate ? "ATRASADA" : "no prazo"
      : "sem data";
    console.log(`\n  [${d.id.slice(-6)}] ${d.title}`);
    console.log(`    valor: ${d.estimatedDemandValue}`);
    console.log(`    planned: ${d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`    actual:  ${d.actualDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`    status: ${late}`);
    if ((deflation as any).NOTE) console.log(`    *** ${(deflation as any).NOTE} (${(deflation as any).daysLate} dias) ***`);
  }

  // Verifica se existe statement assinado para agosto
  const stmt = await prisma.developerMonthlyStatement.findUnique({
    where: {
      developerId_periodMonth_periodYear: {
        developerId: willian.id,
        periodMonth: 8,
        periodYear: 2026,
      },
    },
    select: { id: true, status: true, totalEstimatedValue: true, totalDemands: true },
  });
  console.log(`\nStatement agosto: ${stmt ? `${stmt.status} | total: ${stmt.totalEstimatedValue}` : "não existe"}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
