import {
  calculateDemandEstimatedValue,
  HOURLY_RATES,
  COMBINED_FACTORS,
  WORKER_PROFILE_LABELS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
} from "@/lib/demand-pricing";

// ── Tabela de valores/hora ─────────────────────────────────────────────────

describe("HOURLY_RATES", () => {
  it("JUNIOR = 25",       () => expect(HOURLY_RATES.JUNIOR).toBe(25));
  it("PLENO = 30",        () => expect(HOURLY_RATES.PLENO).toBe(30));
  it("SENIOR = 35",       () => expect(HOURLY_RATES.SENIOR).toBe(35));
  it("ESPECIALISTA = 45", () => expect(HOURLY_RATES.ESPECIALISTA).toBe(45));
});

// ── Tabela de fatores combinados ───────────────────────────────────────────

describe("COMBINED_FACTORS", () => {
  describe("BAIXA", () => {
    it("BAIXO = 1.0",       () => expect(COMBINED_FACTORS.BAIXA.BAIXO).toBe(1.0));
    it("MEDIO = 1.2",       () => expect(COMBINED_FACTORS.BAIXA.MEDIO).toBe(1.2));
    it("ALTO = 1.5",        () => expect(COMBINED_FACTORS.BAIXA.ALTO).toBe(1.5));
    it("ESTRATEGICO = 2.0", () => expect(COMBINED_FACTORS.BAIXA.ESTRATEGICO).toBe(2.0));
  });

  describe("MEDIA", () => {
    it("BAIXO = 1.2",       () => expect(COMBINED_FACTORS.MEDIA.BAIXO).toBe(1.2));
    it("MEDIO = 1.5",       () => expect(COMBINED_FACTORS.MEDIA.MEDIO).toBe(1.5));
    it("ALTO = 2.0",        () => expect(COMBINED_FACTORS.MEDIA.ALTO).toBe(2.0));
    it("ESTRATEGICO = 2.0", () => expect(COMBINED_FACTORS.MEDIA.ESTRATEGICO).toBe(2.0));
  });

  describe("ALTA", () => {
    it("BAIXO = 1.2",       () => expect(COMBINED_FACTORS.ALTA.BAIXO).toBe(1.2));
    it("MEDIO = 1.5",       () => expect(COMBINED_FACTORS.ALTA.MEDIO).toBe(1.5));
    it("ALTO = 2.0",        () => expect(COMBINED_FACTORS.ALTA.ALTO).toBe(2.0));
    it("ESTRATEGICO = 2.0", () => expect(COMBINED_FACTORS.ALTA.ESTRATEGICO).toBe(2.0));
  });

  describe("CRITICA", () => {
    it("BAIXO = 1.5",       () => expect(COMBINED_FACTORS.CRITICA.BAIXO).toBe(1.5));
    it("MEDIO = 1.5",       () => expect(COMBINED_FACTORS.CRITICA.MEDIO).toBe(1.5));
    it("ALTO = 2.0",        () => expect(COMBINED_FACTORS.CRITICA.ALTO).toBe(2.0));
    it("ESTRATEGICO = 2.0", () => expect(COMBINED_FACTORS.CRITICA.ESTRATEGICO).toBe(2.0));
  });
});

// ── Labels ─────────────────────────────────────────────────────────────────

describe("labels", () => {
  it("WORKER_PROFILE_LABELS covers all profiles", () => {
    expect(WORKER_PROFILE_LABELS.JUNIOR).toBe("Júnior");
    expect(WORKER_PROFILE_LABELS.PLENO).toBe("Pleno");
    expect(WORKER_PROFILE_LABELS.SENIOR).toBe("Sênior");
    expect(WORKER_PROFILE_LABELS.ESPECIALISTA).toBe("Especialista");
  });

  it("COMPLEXITY_LABELS covers all levels", () => {
    expect(COMPLEXITY_LABELS.BAIXA).toBe("Baixa");
    expect(COMPLEXITY_LABELS.MEDIA).toBe("Média");
    expect(COMPLEXITY_LABELS.ALTA).toBe("Alta");
    expect(COMPLEXITY_LABELS.CRITICA).toBe("Crítica");
  });

  it("ROI_LABELS covers all levels", () => {
    expect(ROI_LABELS.BAIXO).toBe("Baixo");
    expect(ROI_LABELS.MEDIO).toBe("Médio");
    expect(ROI_LABELS.ALTO).toBe("Alto");
    expect(ROI_LABELS.ESTRATEGICO).toBe("Estratégico");
  });
});

// ── calculateDemandEstimatedValue ──────────────────────────────────────────

describe("calculateDemandEstimatedValue", () => {
  it("returns correct structure with combinedFactor", () => {
    const result = calculateDemandEstimatedValue({
      workerProfile: "JUNIOR", estimatedHours: 10, complexity: "BAIXA", roi: "BAIXO",
    });
    expect(result).toHaveProperty("hourlyRate");
    expect(result).toHaveProperty("estimatedHours");
    expect(result).toHaveProperty("combinedFactor");
    expect(result).toHaveProperty("estimatedValue");
    // old separate multipliers must NOT exist
    expect(result).not.toHaveProperty("complexityMultiplier");
    expect(result).not.toHaveProperty("roiMultiplier");
  });

  it("JUNIOR × 10h × BAIXA/BAIXO = 250", () => {
    // 25 × 10 × 1.0 = 250
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "JUNIOR", estimatedHours: 10, complexity: "BAIXA", roi: "BAIXO",
    });
    expect(estimatedValue).toBe(250);
  });

  it("PLENO × 20h × ALTA/ALTO = 1200", () => {
    // 30 × 20 × 2.0 = 1200
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "PLENO", estimatedHours: 20, complexity: "ALTA", roi: "ALTO",
    });
    expect(estimatedValue).toBe(1200);
  });

  it("SENIOR × 40h × MEDIA/MEDIO = 2100", () => {
    // 35 × 40 × 1.5 = 2100
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "SENIOR", estimatedHours: 40, complexity: "MEDIA", roi: "MEDIO",
    });
    expect(estimatedValue).toBe(2100);
  });

  it("ESPECIALISTA × 80h × CRITICA/ESTRATEGICO = 7200", () => {
    // 45 × 80 × 2.0 = 7200
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "ESPECIALISTA", estimatedHours: 80, complexity: "CRITICA", roi: "ESTRATEGICO",
    });
    expect(estimatedValue).toBe(7200);
  });

  it("JUNIOR × 0.5h × BAIXA/BAIXO = 12.5 (minimum case)", () => {
    // 25 × 0.5 × 1.0 = 12.5
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "JUNIOR", estimatedHours: 0.5, complexity: "BAIXA", roi: "BAIXO",
    });
    expect(estimatedValue).toBe(12.5);
  });

  it("combinedFactor is read from the correct table cell", () => {
    const result = calculateDemandEstimatedValue({
      workerProfile: "SENIOR", estimatedHours: 10, complexity: "CRITICA", roi: "MEDIO",
    });
    expect(result.combinedFactor).toBe(COMBINED_FACTORS.CRITICA.MEDIO); // 1.5
    expect(result.hourlyRate).toBe(35);
    expect(result.estimatedValue).toBeCloseTo(35 * 10 * 1.5, 5);
  });

  it("higher cargo + worst combo always produces greater value than minimum", () => {
    const low  = calculateDemandEstimatedValue({
      workerProfile: "JUNIOR", estimatedHours: 10, complexity: "BAIXA", roi: "BAIXO",
    });
    const high = calculateDemandEstimatedValue({
      workerProfile: "ESPECIALISTA", estimatedHours: 10, complexity: "CRITICA", roi: "ESTRATEGICO",
    });
    expect(high.estimatedValue).toBeGreaterThan(low.estimatedValue);
  });
});
