import { calculateBenchmarkEconomy } from "@/lib/benchmark/calculateBenchmarkEconomy";
import { canViewBenchmark }           from "@/server/auth/permissions";
import type { UserForPermission }     from "@/server/auth/permissions";

function actor(role: UserForPermission["role"]): UserForPermission {
  return { id: "u1", role, isActive: true };
}

describe("calculateBenchmarkEconomy", () => {
  it("SENIOR 40h: bench base = 7200, bench ajustado = 7344, economia = 5944, percentual ≈ 0.8094", () => {
    const r = calculateBenchmarkEconomy({
      estimatedHours: 40,
      workerProfile:  "SENIOR",
      ourValue:       1400,
    });
    expect(r.marketBenchBase).toBe(7200);
    expect(r.marketBenchAdjusted).toBeCloseTo(7344, 2);
    expect(r.rawDifference).toBeCloseTo(-5944, 2);
    expect(r.economy).toBeCloseTo(5944, 2);
    expect(r.economyPercent).toBeCloseTo(0.8094, 3);
    expect(r.status).toBe("COM_ECONOMIA");
  });

  it("JUNIOR usa bench 120/h", () => {
    const r = calculateBenchmarkEconomy({ estimatedHours: 10, workerProfile: "JUNIOR", ourValue: 0 });
    expect(r.marketHourlyRate).toBe(120);
  });

  it("PLENO usa bench 150/h", () => {
    const r = calculateBenchmarkEconomy({ estimatedHours: 10, workerProfile: "PLENO", ourValue: 0 });
    expect(r.marketHourlyRate).toBe(150);
  });

  it("SENIOR usa bench 180/h", () => {
    const r = calculateBenchmarkEconomy({ estimatedHours: 10, workerProfile: "SENIOR", ourValue: 0 });
    expect(r.marketHourlyRate).toBe(180);
  });

  it("ESPECIALISTA usa bench 210/h", () => {
    const r = calculateBenchmarkEconomy({ estimatedHours: 10, workerProfile: "ESPECIALISTA", ourValue: 0 });
    expect(r.marketHourlyRate).toBe(210);
  });

  it("estimatedHours = 0 retorna valores zerados", () => {
    const r = calculateBenchmarkEconomy({ estimatedHours: 0, workerProfile: "SENIOR" });
    expect(r.marketBenchBase).toBe(0);
    expect(r.marketBenchAdjusted).toBe(0);
    expect(r.economy).toBe(0);
    expect(r.economyPercent).toBe(0);
  });

  it("valor nosso maior que bench retorna economy = 0 e status ACIMA_DO_MERCADO", () => {
    const r = calculateBenchmarkEconomy({
      estimatedHours: 40,
      workerProfile:  "JUNIOR",
      ourValue:       99999,
    });
    expect(r.economy).toBe(0);
    expect(r.status).toBe("ACIMA_DO_MERCADO");
  });

  it("valor nosso igual ao bench ajustado retorna status SEM_DIFERENCA", () => {
    // bench base = 10 * 120 = 1200, ajustado = 1200 * 1.02 = 1224
    const r = calculateBenchmarkEconomy({
      estimatedHours: 10,
      workerProfile:  "JUNIOR",
      ourValue:       1224,
    });
    expect(r.status).toBe("SEM_DIFERENCA");
    expect(r.economy).toBe(0);
  });

  it("usa HOURLY_RATES internos quando ourHourlyRate não informado e ourValue não informado", () => {
    // SENIOR: 35/h, 10h = 350. Bench: 180 * 10 * 1.02 = 1836 → economia positiva
    const r = calculateBenchmarkEconomy({ estimatedHours: 10, workerProfile: "SENIOR" });
    expect(r.ourHourlyRate).toBe(35);
    expect(r.ourValue).toBe(350);
    expect(r.status).toBe("COM_ECONOMIA");
  });
});

describe("canViewBenchmark", () => {
  it("retorna true para ADMIN",   () => expect(canViewBenchmark(actor("ADMIN"))).toBe(true));
  it("retorna true para DIRETOR", () => expect(canViewBenchmark(actor("DIRETOR"))).toBe(true));
  it("retorna true para GESTOR",  () => expect(canViewBenchmark(actor("GESTOR"))).toBe(true));
  it("retorna false para DEV",        () => expect(canViewBenchmark(actor("DEV"))).toBe(false));
  it("retorna false para SOLICITANTE",() => expect(canViewBenchmark(actor("SOLICITANTE"))).toBe(false));
  it("retorna false para APROVADOR",  () => expect(canViewBenchmark(actor("APROVADOR"))).toBe(false));
  it("retorna false para FINANCEIRO", () => expect(canViewBenchmark(actor("FINANCEIRO"))).toBe(false));
  it("retorna false para SUPORTE",    () => expect(canViewBenchmark(actor("SUPORTE"))).toBe(false));
});
