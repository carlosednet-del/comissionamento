import {
  calculateDemandEstimatedValue,
  HOURLY_RATES,
  COMPLEXITY_MULTIPLIERS,
  ROI_MULTIPLIERS,
  WORKER_PROFILE_LABELS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
} from "@/lib/demand-pricing";

// ── Tabelas ────────────────────────────────────────────────────────────────

describe("HOURLY_RATES", () => {
  it("has correct rate for JUNIOR",       () => expect(HOURLY_RATES.JUNIOR).toBe(60));
  it("has correct rate for PLENO",        () => expect(HOURLY_RATES.PLENO).toBe(80));
  it("has correct rate for SENIOR",       () => expect(HOURLY_RATES.SENIOR).toBe(100));
  it("has correct rate for ESPECIALISTA", () => expect(HOURLY_RATES.ESPECIALISTA).toBe(130));
});

describe("COMPLEXITY_MULTIPLIERS", () => {
  it("BAIXA = 1.0",   () => expect(COMPLEXITY_MULTIPLIERS.BAIXA).toBe(1.0));
  it("MEDIA = 1.2",   () => expect(COMPLEXITY_MULTIPLIERS.MEDIA).toBe(1.2));
  it("ALTA = 1.5",    () => expect(COMPLEXITY_MULTIPLIERS.ALTA).toBe(1.5));
  it("CRITICA = 2.0", () => expect(COMPLEXITY_MULTIPLIERS.CRITICA).toBe(2.0));
});

describe("ROI_MULTIPLIERS", () => {
  it("BAIXO = 1.00",       () => expect(ROI_MULTIPLIERS.BAIXO).toBe(1.00));
  it("MEDIO = 1.15",       () => expect(ROI_MULTIPLIERS.MEDIO).toBe(1.15));
  it("ALTO = 1.30",        () => expect(ROI_MULTIPLIERS.ALTO).toBe(1.30));
  it("ESTRATEGICO = 1.50", () => expect(ROI_MULTIPLIERS.ESTRATEGICO).toBe(1.50));
});

// ── Labels ─────────────────────────────────────────────────────────────────

describe("labels", () => {
  it("WORKER_PROFILE_LABELS has all profiles",  () => {
    expect(WORKER_PROFILE_LABELS.JUNIOR).toBe("Júnior");
    expect(WORKER_PROFILE_LABELS.PLENO).toBe("Pleno");
    expect(WORKER_PROFILE_LABELS.SENIOR).toBe("Sênior");
    expect(WORKER_PROFILE_LABELS.ESPECIALISTA).toBe("Especialista");
  });

  it("COMPLEXITY_LABELS has all levels", () => {
    expect(COMPLEXITY_LABELS.BAIXA).toBe("Baixa");
    expect(COMPLEXITY_LABELS.MEDIA).toBe("Média");
    expect(COMPLEXITY_LABELS.ALTA).toBe("Alta");
    expect(COMPLEXITY_LABELS.CRITICA).toBe("Crítica");
  });

  it("ROI_LABELS has all levels", () => {
    expect(ROI_LABELS.BAIXO).toBe("Baixo");
    expect(ROI_LABELS.MEDIO).toBe("Médio");
    expect(ROI_LABELS.ALTO).toBe("Alto");
    expect(ROI_LABELS.ESTRATEGICO).toBe("Estratégico");
  });
});

// ── calculateDemandEstimatedValue ──────────────────────────────────────────

describe("calculateDemandEstimatedValue", () => {
  it("returns correct structure", () => {
    const result = calculateDemandEstimatedValue({
      workerProfile:  "JUNIOR",
      estimatedHours: 10,
      complexity:     "BAIXA",
      roi:            "BAIXO",
    });
    expect(result).toHaveProperty("hourlyRate");
    expect(result).toHaveProperty("estimatedHours");
    expect(result).toHaveProperty("complexityMultiplier");
    expect(result).toHaveProperty("roiMultiplier");
    expect(result).toHaveProperty("estimatedValue");
  });

  it("JUNIOR × 10h × BAIXA × BAIXO = 600", () => {
    // 60 × 10 × 1.0 × 1.0 = 600
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile:  "JUNIOR",
      estimatedHours: 10,
      complexity:     "BAIXA",
      roi:            "BAIXO",
    });
    expect(estimatedValue).toBe(600);
  });

  it("PLENO × 20h × ALTA × ALTO = 3120", () => {
    // 80 × 20 × 1.5 × 1.30 = 3120
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile:  "PLENO",
      estimatedHours: 20,
      complexity:     "ALTA",
      roi:            "ALTO",
    });
    expect(estimatedValue).toBeCloseTo(3120, 2);
  });

  it("SENIOR × 40h × MEDIA × MEDIO", () => {
    // 100 × 40 × 1.2 × 1.15 = 5520
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile:  "SENIOR",
      estimatedHours: 40,
      complexity:     "MEDIA",
      roi:            "MEDIO",
    });
    expect(estimatedValue).toBeCloseTo(5520, 2);
  });

  it("ESPECIALISTA × 80h × CRITICA × ESTRATEGICO", () => {
    // 130 × 80 × 2.0 × 1.50 = 31200
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile:  "ESPECIALISTA",
      estimatedHours: 80,
      complexity:     "CRITICA",
      roi:            "ESTRATEGICO",
    });
    expect(estimatedValue).toBeCloseTo(31200, 2);
  });

  it("echoes back the correct inputs in the result", () => {
    const result = calculateDemandEstimatedValue({
      workerProfile:  "SENIOR",
      estimatedHours: 15,
      complexity:     "ALTA",
      roi:            "ALTO",
    });
    expect(result.hourlyRate).toBe(100);
    expect(result.estimatedHours).toBe(15);
    expect(result.complexityMultiplier).toBe(1.5);
    expect(result.roiMultiplier).toBe(1.3);
  });

  it("minimum value: JUNIOR × 0.5h × BAIXA × BAIXO = 30", () => {
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile:  "JUNIOR",
      estimatedHours: 0.5,
      complexity:     "BAIXA",
      roi:            "BAIXO",
    });
    expect(estimatedValue).toBe(30);
  });

  it("maximum multipliers produce higher values", () => {
    const low = calculateDemandEstimatedValue({
      workerProfile: "JUNIOR", estimatedHours: 10, complexity: "BAIXA", roi: "BAIXO",
    });
    const high = calculateDemandEstimatedValue({
      workerProfile: "ESPECIALISTA", estimatedHours: 10, complexity: "CRITICA", roi: "ESTRATEGICO",
    });
    expect(high.estimatedValue).toBeGreaterThan(low.estimatedValue);
  });
});
