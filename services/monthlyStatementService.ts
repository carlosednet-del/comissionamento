import { prisma }                   from "@/lib/prisma";
import { auditService }              from "@/services/auditService";
import { generateSignatureCode }     from "@/lib/statement/generateSignatureCode";
import { generateStatementContentHash } from "@/lib/statement/generateContentHash";
import { periodBounds, signingWindow, isSigningWindowOpen } from "@/lib/statement/statementPeriod";
import type { StatementData, StatementPreviewItem, StatementTotals } from "@/types";

async function fetchHomologatedDemands(developerId: string, month: number, year: number) {
  const { gte, lte } = periodBounds(month, year);
  return prisma.demand.findMany({
    where: {
      assigneeId:        developerId,
      status:            "HOMOLOGADA_PRODUCAO",
      actualDeliveryDate: { gte, lte },
    },
    orderBy: { actualDeliveryDate: "asc" },
  });
}

function demandToPreviewItem(d: {
  id: string;
  title: string;
  requesterArea: string;
  demandType: string;
  complexity: string | null;
  roi: string | null;
  estimatedHours: number | null;
  hourlyRateSnapshot: number | null;
  estimatedDemandValue: number | null;
  actualDeliveryDate: Date | null;
}): StatementPreviewItem {
  return {
    demandId:      d.id,
    demandCode:    d.id.slice(-6).toUpperCase(),
    demandTitle:   d.title,
    requesterArea: d.requesterArea,
    demandType:    d.demandType,
    complexity:    d.complexity,
    roi:           d.roi,
    estimatedHours: d.estimatedHours ?? 0,
    hourlyRate:    d.hourlyRateSnapshot,
    estimatedValue: d.estimatedDemandValue ?? 0,
    deliveryDate:  d.actualDeliveryDate ? d.actualDeliveryDate.toISOString() : null,
  };
}

function calcTotals(items: StatementPreviewItem[]): StatementTotals {
  return {
    totalDemands:        items.length,
    totalEstimatedHours: items.reduce((s, i) => s + i.estimatedHours, 0),
    totalEstimatedValue: items.reduce((s, i) => s + i.estimatedValue, 0),
  };
}

async function ensureUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateSignatureCode();
    const exists = await prisma.developerMonthlyStatement.findUnique({
      where: { signatureCode: code },
    });
    if (!exists) return code;
  }
  throw new Error("Não foi possível gerar um código de assinatura único após 10 tentativas.");
}

// ── Service ───────────────────────────────────────────────────────

export const monthlyStatementService = {
  /** Retorna os dados de preview/estado do extrato para o mês selecionado. */
  async getMyStatement(userId: string, month: number, year: number): Promise<StatementData> {
    const developer = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, email: true, workerProfile: true, monthlyBaseSalary: true },
    });
    if (!developer) throw new Error("Usuário não encontrado.");

    const { gte: periodStart, lte: periodEnd } = periodBounds(month, year);
    const window = signingWindow(month, year);
    const windowIsOpen = isSigningWindowOpen(month, year);

    // Busca demandas homologadas no período
    const demands = await fetchHomologatedDemands(userId, month, year);
    const items   = demands.map(demandToPreviewItem);
    const totals  = calcTotals(items);

    // Se já existe um statement assinado, retorna os itens materializados
    const existing = await prisma.developerMonthlyStatement.findUnique({
      where: {
        developerId_periodMonth_periodYear: { developerId: userId, periodMonth: month, periodYear: year },
      },
      include: { items: { orderBy: { homologationDate: "asc" } } },
    });

    if (existing?.status === "SIGNED" || existing?.status === "EXPORTED") {
      // Retorna os itens materializados (snapshot imutável)
      const signedItems: StatementPreviewItem[] = existing.items.map((it) => ({
        demandId:      it.demandId,
        demandCode:    it.demandCode ?? it.demandId.slice(-6).toUpperCase(),
        demandTitle:   it.demandTitle,
        requesterArea: it.requesterArea,
        demandType:    it.demandType,
        complexity:    it.complexity,
        roi:           it.roi,
        estimatedHours: Number(it.estimatedHours),
        hourlyRate:    it.hourlyRate !== null ? Number(it.hourlyRate) : null,
        estimatedValue: Number(it.estimatedValue),
        deliveryDate:  it.homologationDate ? it.homologationDate.toISOString() : null,
      }));

      return {
        developer: {
          id:                developer.id,
          name:              developer.name,
          email:             developer.email,
          workerProfile:     developer.workerProfile,
          monthlyBaseSalary: developer.monthlyBaseSalary ?? null,
        },
        periodMonth:  month,
        periodYear:   year,
        periodStart:  periodStart.toISOString(),
        periodEnd:    periodEnd.toISOString(),
        items:        signedItems,
        totals: {
          totalDemands:        existing.totalDemands,
          totalEstimatedHours: existing.totalEstimatedHours,
          totalEstimatedValue: existing.totalEstimatedValue,
        },
        statement: {
          id:                 existing.id,
          status:             existing.status,
          signedAt:           existing.signedAt?.toISOString() ?? null,
          signatureCode:      existing.signatureCode,
          signatureIp:        existing.signatureIp,
          signatureUserAgent: existing.signatureUserAgent,
          contentHash:        existing.contentHash,
        },
        signingWindow: {
          open:   window.open.toISOString(),
          close:  window.close.toISOString(),
          isOpen: windowIsOpen,
        },
      };
    }

    return {
      developer: {
        id:                developer.id,
        name:              developer.name,
        email:             developer.email,
        workerProfile:     developer.workerProfile,
        monthlyBaseSalary: developer.monthlyBaseSalary ?? null,
      },
      periodMonth:  month,
      periodYear:   year,
      periodStart:  periodStart.toISOString(),
      periodEnd:    periodEnd.toISOString(),
      items,
      totals,
      statement: existing
        ? {
            id:                 existing.id,
            status:             existing.status,
            signedAt:           null,
            signatureCode:      null,
            signatureIp:        null,
            signatureUserAgent: null,
            contentHash:        null,
          }
        : null,
      signingWindow: {
        open:   window.open.toISOString(),
        close:  window.close.toISOString(),
        isOpen: windowIsOpen,
      },
    };
  },

  /** Assina o extrato do período. Apenas o próprio DEV pode assinar. */
  async signStatement(
    userId: string,
    month: number,
    year: number,
    meta: { ip: string; userAgent: string },
  ): Promise<{ signatureCode: string; signedAt: string; statementId: string }> {
    const developer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!developer) throw new Error("Usuário não encontrado.");
    if (developer.role !== "DEV") throw new Error("Apenas DEVs podem assinar extratos.");

    if (!isSigningWindowOpen(month, year)) {
      const { open, close } = signingWindow(month, year);
      const fmt = (d: Date) =>
        d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      throw new Error(
        `Fora do prazo de assinatura. O extrato de ${String(month).padStart(2, "0")}/${year} ` +
        `só pode ser assinado entre ${fmt(open)} e ${fmt(close)}.`,
      );
    }

    const demands = await fetchHomologatedDemands(userId, month, year);
    if (demands.length === 0) {
      throw new Error("Nenhuma demanda homologada encontrada para este período. Não é possível assinar um extrato vazio.");
    }

    // Encontra ou cria o statement
    const existing = await prisma.developerMonthlyStatement.findUnique({
      where: {
        developerId_periodMonth_periodYear: { developerId: userId, periodMonth: month, periodYear: year },
      },
    });

    if (existing?.status === "SIGNED" || existing?.status === "EXPORTED") {
      throw new Error("Este extrato já foi assinado e não pode ser assinado novamente.");
    }

    const items   = demands.map(demandToPreviewItem);
    const totals  = calcTotals(items);

    // Gera assinatura
    const signatureCode = await ensureUniqueCode();
    const signedAt      = new Date();
    const contentHash   = generateStatementContentHash({
      developerId:         userId,
      periodMonth:         month,
      periodYear:          year,
      totalEstimatedHours: totals.totalEstimatedHours,
      totalEstimatedValue: totals.totalEstimatedValue,
      demands: items.map((i) => ({
        demandId:       i.demandId,
        estimatedHours: i.estimatedHours,
        estimatedValue: i.estimatedValue,
      })),
    });

    // Upsert do statement + materialização dos itens (em transação)
    const statement = await prisma.$transaction(async (tx) => {
      const stmt = await tx.developerMonthlyStatement.upsert({
        where: {
          developerId_periodMonth_periodYear: { developerId: userId, periodMonth: month, periodYear: year },
        },
        create: {
          developerId:         userId,
          periodMonth:         month,
          periodYear:          year,
          status:              "SIGNED",
          totalDemands:        totals.totalDemands,
          totalEstimatedHours: totals.totalEstimatedHours,
          totalEstimatedValue: totals.totalEstimatedValue,
          signedAt,
          signedById:          userId,
          signatureIp:         meta.ip,
          signatureUserAgent:  meta.userAgent,
          signatureCode,
          contentHash,
        },
        update: {
          status:              "SIGNED",
          totalDemands:        totals.totalDemands,
          totalEstimatedHours: totals.totalEstimatedHours,
          totalEstimatedValue: totals.totalEstimatedValue,
          signedAt,
          signedById:          userId,
          signatureIp:         meta.ip,
          signatureUserAgent:  meta.userAgent,
          signatureCode,
          contentHash,
        },
      });

      // Remove itens anteriores (se havia PENDING) e materializa novos
      await tx.developerMonthlyStatementItem.deleteMany({ where: { statementId: stmt.id } });

      await tx.developerMonthlyStatementItem.createMany({
        data: items.map((it) => ({
          statementId:      stmt.id,
          demandId:         it.demandId,
          demandCode:       it.demandCode,
          demandTitle:      it.demandTitle,
          requesterArea:    it.requesterArea,
          demandType:       it.demandType,
          complexity:       it.complexity,
          roi:              it.roi,
          estimatedHours:   it.estimatedHours,
          hourlyRate:       it.hourlyRate,
          estimatedValue:   it.estimatedValue,
          homologationDate: it.deliveryDate ? new Date(it.deliveryDate) : null,
        })),
      });

      return stmt;
    });

    // Auditoria
    await auditService.log({
      entity:   "DeveloperMonthlyStatement",
      entityId: statement.id,
      action:   "STATEMENT_SIGNED",
      newValue: {
        developerId:   userId,
        developerName: developer.name,
        periodMonth:   month,
        periodYear:    year,
        signatureCode,
        signatureIp:   meta.ip,
        totalDemands:  totals.totalDemands,
        totalValue:    totals.totalEstimatedValue,
      },
      userId,
    });

    return {
      signatureCode,
      signedAt: signedAt.toISOString(),
      statementId: statement.id,
    };
  },

  /** Gera o conteúdo CSV de um extrato assinado. */
  async exportSignedStatement(
    statementId: string,
    actorId: string,
  ): Promise<{ content: string; filename: string }> {
    const stmt = await prisma.developerMonthlyStatement.findUnique({
      where:   { id: statementId },
      include: {
        developer: { select: { id: true, name: true, email: true, workerProfile: true } },
        items:     { orderBy: { homologationDate: "asc" } },
      },
    });

    if (!stmt) throw new Error("Extrato não encontrado.");
    if (stmt.status !== "SIGNED" && stmt.status !== "EXPORTED") {
      throw new Error("Assine o extrato antes de exportar.");
    }

    const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const fmtDate = (d: Date | null | undefined) =>
      d ? new Intl.DateTimeFormat("pt-BR").format(new Date(d)) : "—";

    const mm  = String(stmt.periodMonth).padStart(2, "0");
    const yy  = stmt.periodYear;
    const devSlug = stmt.developer.name.replace(/\s+/g, "-").toLowerCase();

    const rows: string[] = [];
    const esc = (v: string | null | undefined) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;

    // Cabeçalho do documento
    rows.push(`﻿${esc("Sistema")},${esc("Gestor de Demandas Técnicas")}`);
    rows.push(`${esc("Título")},${esc("Extrato Mensal Assinado")}`);
    rows.push(`${esc("Período")},${esc(`${mm}/${yy}`)}`);
    rows.push(`${esc("DEV")},${esc(stmt.developer.name)}`);
    rows.push(`${esc("E-mail")},${esc(stmt.developer.email)}`);
    rows.push(`${esc("Perfil")},${esc(stmt.developer.workerProfile ?? "—")}`);
    rows.push(`${esc("Status")},${esc("ASSINADO")}`);
    rows.push(`${esc("Código de assinatura")},${esc(stmt.signatureCode ?? "—")}`);
    rows.push(`${esc("Assinado em")},${esc(stmt.signedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(stmt.signedAt) : "—")}`);
    rows.push(`${esc("IP da assinatura")},${esc(stmt.signatureIp ?? "—")}`);
    rows.push(`${esc("Hash do conteúdo")},${esc(stmt.contentHash ?? "—")}`);
    rows.push("");

    // Cabeçalho da tabela
    rows.push([
      esc("ID"), esc("Título"), esc("Área"), esc("Tipo"),
      esc("Complexidade"), esc("ROI"),
      esc("Horas"), esc("Valor/hora"), esc("Valor estimado"), esc("Entrega"),
    ].join(","));

    // Linhas
    for (const item of stmt.items) {
      rows.push([
        esc(item.demandCode ?? item.demandId.slice(-6).toUpperCase()),
        esc(item.demandTitle),
        esc(item.requesterArea),
        esc(item.demandType),
        esc(item.complexity),
        esc(item.roi),
        esc(String(item.estimatedHours)),
        esc(item.hourlyRate !== null ? BRL.format(Number(item.hourlyRate)) : "—"),
        esc(BRL.format(Number(item.estimatedValue))),
        esc(fmtDate(item.homologationDate)),
      ].join(","));
    }

    rows.push("");
    rows.push(`${esc("Total de demandas")},${esc(String(stmt.totalDemands))}`);
    rows.push(`${esc("Total de horas")},${esc(String(stmt.totalEstimatedHours))}`);
    rows.push(`${esc("Total de valor")},${esc(BRL.format(stmt.totalEstimatedValue))}`);

    // Marca como EXPORTED se ainda SIGNED
    if (stmt.status === "SIGNED") {
      await prisma.developerMonthlyStatement.update({
        where: { id: statementId },
        data:  { status: "EXPORTED" },
      });
    }

    await auditService.log({
      entity:   "DeveloperMonthlyStatement",
      entityId: statementId,
      action:   "STATEMENT_EXPORTED",
      newValue: { statementId, exportedBy: actorId, period: `${mm}/${yy}` },
      userId:   actorId,
    });

    return {
      content:  rows.join("\n"),
      filename: `extrato-${devSlug}-${mm}-${yy}.csv`,
    };
  },
};
