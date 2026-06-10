import { requireRole } from "@/server/auth/helpers";
import { pricingConfigService } from "@/services/pricingConfigService";
import { PricingTable }       from "@/components/configuracoes/pricing-table";
import { CombinedFactorTable } from "@/components/configuracoes/combined-factor-table";
import { DeflatorTable }      from "@/components/configuracoes/deflator-table";
import { Separator } from "@/components/ui/separator";
import { DollarSign, BarChart3, TrendingDown, Table2 } from "lucide-react";

export const metadata = { title: "Configurações — Gestor de Demandas" };

export default async function ConfiguracoesPage() {
  await requireRole(["ADMIN"]);

  const [pricingRows, combinedRows, deflatorRows] = await Promise.all([
    pricingConfigService.getAll(),
    pricingConfigService.getAllCombinedFactors(),
    pricingConfigService.getAllDeflatorFactors(),
  ]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parâmetros de precificação utilizados no cálculo do valor estimado das demandas.
          Todos os valores são editáveis e entram em vigor imediatamente nas novas demandas.
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
          comissão mensal. Clique no ícone de lápis para editar.
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
          Fórmula:{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">valor/hora × horas × fator</code>.
          Clique em qualquer célula para editar.
        </p>
        <CombinedFactorTable initialRows={combinedRows} />
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
          &ldquo;DU&rdquo; = dias úteis (seg–sex). Fator entre 0 e 1 (ex: 0.75 = −25%).
        </p>
        <DeflatorTable initialRows={deflatorRows} />
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
          Alterações entram em vigor imediatamente nas próximas demandas criadas.
          Demandas já existentes mantêm o snapshot gravado no momento da criação.
        </p>
      </div>
    </div>
  );
}
