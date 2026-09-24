import { PrismaClient } from "@prisma/client";
import { periodBounds } from "@/lib/statement/statementPeriod";
import { applyDeflator } from "@/lib/demand-pricing";

const prisma = new PrismaClient();
const ADMIN_ID = "7baac510-4800-40c1-8cc9-288311be06c2";

async function main() {
  const hudson = await prisma.user.findFirst({
    where: { name: { contains: "Hudson", mode: "insensitive" } },
    select: { id: true, name: true, workerProfile: true },
  });
  if (!hudson) { console.log("Hudson não encontrado"); return; }
  console.log(`Hudson: ${hudson.id} — ${hudson.name}`);

  // Verifica se já existe
  const existing = await prisma.developerMonthlyStatement.findFirst({
    where: { developerId: hudson.id, periodMonth: 7, periodYear: 2026 },
  });
  if (existing) {
    console.log(`Já existe: ${existing.status}`);
    return;
  }

  // Calcula totais do período julho (16/06 – 15/07/2026)
  const { gte, lte } = periodBounds(7, 2026);
  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: hudson.id,
      actualDeliveryDate: { gte, lte },
    },
    select: {
      id: true,
      estimatedDemandValue: true,
      estimatedHours: true,
      actualDeliveryDate: true,
      plannedDeliveryDate: true,
    },
  });

  const totalDemands        = demands.length;
  const totalEstimatedHours = demands.reduce((s, d) => s + (d.estimatedHours ?? 0), 0);
  const totalEstimatedValue = demands.reduce((s, d) => {
    const v = applyDeflator(d.estimatedDemandValue ?? 0, d.actualDeliveryDate, d.plannedDeliveryDate).deflatedValue;
    return s + v;
  }, 0);

  console.log(`Período 16/06–15/07: ${totalDemands} demandas | ${totalEstimatedHours}h | R$${totalEstimatedValue.toFixed(2)}`);

  // Cria extrato CANCELED (colaborador desligado — sem assinatura pessoal)
  const stmt = await prisma.developerMonthlyStatement.create({
    data: {
      developerId:         hudson.id,
      periodMonth:         7,
      periodYear:          2026,
      status:              "CANCELED",
      totalDemands,
      totalEstimatedHours,
      totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
      signedAt:            new Date("2026-07-20T10:37:00.000Z"),
      signedById:          ADMIN_ID,
      signatureUserAgent:  "SISTEMA — Colaborador desligado",
      signatureCode:       `SISTEMA-DESLIGAMENTO-HUDSON-${Date.now()}`,
    },
  });

  console.log(`✓ Extrato CANCELED criado para Hudson Porto (julho/2026) | id: ${stmt.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
