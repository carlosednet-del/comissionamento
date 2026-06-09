import { requireRole } from "@/server/auth/helpers";
import { pricingConfigService } from "@/services/pricingConfigService";
import { PricingTable } from "@/components/configuracoes/pricing-table";
import { Separator } from "@/components/ui/separator";
import {
  COMBINED_FACTORS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
  DEFLATOR_FACTORS,
} from "@/lib/demand-pricing";
import { DollarSign, Table2, TrendingDown, BarChart3 } from "lucide-react";
import type { ComplexityLevel, RoiLevel } from "@prisma/client";

export const metadata = { title: "Configurações — Gestor de Demandas" };

// ── Helpers de formatação ────────────────────────────────────────────────────

function factorClass(v: number) {
  if (v >= 2.0) return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200";
  if (v >= 1.5) return "bg-blue-100   text-blue-800   dark:bg-blue-950   dark:text-blue-200";
  if (v >= 1.2) return "bg-green-100  text-green-800  dark:bg-green-950  dark:text-green-200";
  return "bg-muted text-muted-foreground";
}

function deflatorClass(v: number) {
  if (v === 1.00) return "bg-green-100  text-green-800  dark:bg-green-950  dark:text-green-200";
  if (v >= 0.50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
  if (v > 0)     return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}

const COMPLEXITIES: ComplexityLevel[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const ROIS: RoiLevel[]               = ["BAIXO", "MEDIO", "ALTO", "ESTRATEGICO"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfiguracoesPage() {
  await requireRole(["ADMIN"]);

  const pricingRows = await pricingConfigService.getAll();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parâmetros de precificação utilizados no cálculo do valor estimado das demandas.
        </p>
      </div>

      <Separator />

      {/* ── Tabela 1: Valor/hora e Teto mensal ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-brand-primary" />
          <h2 className="text-lg font-semibold">Valor / hora e Teto mensal por perfil</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Define quanto vale cada hora de trabalho por perfil técnico e o teto máximo de
          comissão mensal. Clique no ícone de lápis para editar um perfil.
        </p>
        <PricingTable initialRows={pricingRows} />
      </section>

      <Separator />

      {/* ── Tabela 2: Fator Complexidade × ROI ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-primary" />
          <h2 className="text-lg font-semibold">Fator combinado — Complexidade × ROI</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Multiplicador aplicado ao produto <em>valor/hora × horas estimadas</em>.
          Fórmula: <code className="text-xs bg-muted px-1 py-0.5 rounded">valor/hora × horas × fator</code>.
        </p>

        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">
                  Complexidade \ ROI
                </th>
                {ROIS.map((roi) => (
                  <th key={roi} className="px-4 py-2.5 font-medium text-center">
                    {ROI_LABELS[roi]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPLEXITIES.map((complexity, ci) => (
                <tr key={complexity} className={ci % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-4 py-2.5 font-medium">{COMPLEXITY_LABELS[complexity]}</td>
                  {ROIS.map((roi) => {
                    const f = COMBINED_FACTORS[complexity][roi];
                    return (
                      <td key={roi} className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${factorClass(f)}`}
                        >
                          ×{f.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { label: "×1.00", cls: factorClass(1.0) },
            { label: "×1.20 – ×1.20", cls: factorClass(1.2) },
            { label: "×1.50", cls: factorClass(1.5) },
            { label: "×2.00", cls: factorClass(2.0) },
          ].map(({ label, cls }) => (
            <span key={label} className={`inline-block rounded px-2 py-0.5 font-semibold ${cls}`}>
              {label}
            </span>
          ))}
          <span className="text-muted-foreground self-center">← multiplicadores crescentes por relevância</span>
        </div>
      </section>

      <Separator />

      {/* ── Tabela 3: Deflator por atraso ───────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-brand-primary" />
          <h2 className="text-lg font-semibold">Deflator por atraso na entrega</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Fator aplicado ao valor final quando a entrega ocorre após a data prevista.
          &ldquo;DU&rdquo; = dias úteis (seg–sex). Base:{" "}
          <em>data de entrega real − data de entrega prevista</em>.
        </p>

        <div className="rounded-lg border overflow-auto max-w-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Atraso</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Fator</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Desconto</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Situação</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Sem atraso",  du: 0 },
                { label: "1 DU",        du: 1 },
                { label: "2 DU",        du: 2 },
                { label: "3 DU",        du: 3 },
                { label: "4 DU",        du: 4 },
                { label: "5 ou mais DU", du: 5 },
              ].map(({ label, du }, i) => {
                const factor  = DEFLATOR_FACTORS[du] ?? 0;
                const discount = `−${((1 - factor) * 100).toFixed(0)}%`;
                return (
                  <tr key={du} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-4 py-2.5 font-medium">{label}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${deflatorClass(factor)}`}
                      >
                        ×{factor.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground tabular-nums">
                      {discount}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {du === 0
                        ? "Valor integral"
                        : du <= 2
                        ? "Redução parcial"
                        : du <= 4
                        ? "Redução severa"
                        : "Valor zerado"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Nota de rodapé ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="font-medium text-foreground">Sobre a precificação</span>
        </div>
        <p>
          Valor estimado = <strong>valor/hora × horas estimadas × fator (complexidade × ROI)</strong>.
        </p>
        <p>
          Valor a pagar = <code className="text-xs bg-muted px-1 rounded">max(0, min(valor_final − salário_base, max(0, teto − salário_base)))</code>.
        </p>
        <p>
          Alterações em valor/hora e teto mensal entram em vigor imediatamente nas próximas demandas criadas.
          Demandas já existentes mantêm o snapshot gravado no momento da criação.
        </p>
      </div>
    </div>
  );
}
