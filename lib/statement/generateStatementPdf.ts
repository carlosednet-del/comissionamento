import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { StatementData } from "@/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
};

/** Verde do card de assinatura na UI (emerald-600), para manter coerência visual. */
const ACCENT: [number, number, number] = [5, 150, 105];
const MUTED: [number, number, number] = [100, 116, 139];

/**
 * Gera o PDF do extrato mensal assinado e dispara o download.
 *
 * O conteúdo espelha o CSV de `monthlyStatementService.exportSignedStatement`
 * para que os dois formatos representem o mesmo documento.
 */
export function generateStatementPdf(data: StatementData): string {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 12;

  const mm = String(data.periodMonth).padStart(2, "0");
  const yy = data.periodYear;
  const stmt = data.statement;

  // ── Cabeçalho ───────────────────────────────────────────────────
  doc.setFontSize(15).setFont("helvetica", "bold");
  doc.text("Extrato Mensal Assinado", marginX, 15);

  doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(...MUTED);
  doc.text("Gestor de Demandas Técnicas", marginX, 20.5);
  doc.setTextColor(0, 0, 0);

  // Período em destaque à direita
  doc.setFontSize(11).setFont("helvetica", "bold");
  doc.text(`Período ${mm}/${yy}`, pageWidth - marginX, 15, { align: "right" });
  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(...MUTED);
  doc.text(
    `${fmtDate(data.periodStart)} a ${fmtDate(data.periodEnd)}`,
    pageWidth - marginX, 20.5, { align: "right" },
  );
  doc.setTextColor(0, 0, 0);

  // ── Identificação do DEV ────────────────────────────────────────
  autoTable(doc, {
    startY: 25,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 24, textColor: MUTED },
      1: { cellWidth: 75 },
      2: { fontStyle: "bold", cellWidth: 24, textColor: MUTED },
      3: { cellWidth: "auto" },
    },
    body: [
      ["DEV", data.developer.name, "E-mail", data.developer.email],
      ["Perfil", data.developer.workerProfile ?? "—", "Status", stmt?.status === "EXPORTED" ? "EXPORTADO" : "ASSINADO"],
    ],
  });

  // ── Tabela de demandas ──────────────────────────────────────────
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4,
    head: [[
      "ID", "Título", "Área", "Tipo", "Complexidade",
      "ROI", "Horas", "Valor/h", "Valor estimado", "Entrega",
    ]],
    body: data.items.map((it) => [
      it.demandCode,
      it.demandTitle,
      it.requesterArea ?? "—",
      it.demandType ?? "—",
      it.complexity ?? "—",
      it.roi ?? "—",
      `${it.estimatedHours}h`,
      it.hourlyRate !== null ? BRL.format(it.hourlyRate) : "—",
      BRL.format(it.estimatedValue),
      fmtDate(it.deliveryDate),
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold" },
      1: { cellWidth: 62 },
      6: { halign: "right", cellWidth: 13 },
      7: { halign: "right", cellWidth: 20 },
      8: { halign: "right", cellWidth: 25, fontStyle: "bold" },
      9: { halign: "center", cellWidth: 20 },
    },
    margin: { left: marginX, right: marginX },
  });

  // ── Totais ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.2, fontStyle: "bold" },
    columnStyles: { 0: { halign: "right" } },
    body: [[
      `${data.totals.totalDemands} demandas`,
      `${data.totals.totalEstimatedHours}h estimadas`,
      BRL.format(data.totals.totalEstimatedValue),
    ]],
    didParseCell: (hook) => {
      if (hook.column.index === 2) hook.cell.styles.textColor = ACCENT;
    },
    margin: { left: marginX, right: marginX },
  });

  // ── Bloco de assinatura ─────────────────────────────────────────
  if (stmt) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    doc.setFontSize(9.5).setFont("helvetica", "bold").setTextColor(...ACCENT);
    doc.text("Extrato assinado", marginX, y);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: y + 2,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 42, textColor: MUTED },
        1: { cellWidth: "auto" },
      },
      body: [
        ["Código de assinatura", stmt.signatureCode ?? "—"],
        ["Assinado em", stmt.signedAt ? DATETIME_FMT.format(new Date(stmt.signedAt)) : "—"],
        ["IP da assinatura", stmt.signatureIp ?? "—"],
        ["Hash do conteúdo (SHA-256)", stmt.contentHash ?? "—"],
      ],
      margin: { left: marginX, right: marginX },
    });
  }

  // ── Rodapé com paginação ────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(...MUTED);
    doc.text(
      `Documento gerado em ${DATETIME_FMT.format(new Date())}`,
      marginX, h - 6,
    );
    doc.text(`Página ${i} de ${total}`, pageWidth - marginX, h - 6, { align: "right" });
  }

  const devSlug = data.developer.name.replace(/\s+/g, "-").toLowerCase();
  const filename = `extrato-${devSlug}-${mm}-${yy}.pdf`;
  doc.save(filename);
  return filename;
}
