import {
  calculateDemandEstimatedValue,
  HOURLY_RATES,
  COMBINED_FACTORS,
  WORKER_PROFILE_LABELS,
  PROFILE_GROUPS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
} from "@/lib/demand-pricing";

// ── Tabela de valores/hora ─────────────────────────────────────────────────

describe("HOURLY_RATES", () => {
  // Desenvolvedor
  it("JUNIOR = 25",       () => expect(HOURLY_RATES.JUNIOR).toBe(25));
  it("PLENO = 30",        () => expect(HOURLY_RATES.PLENO).toBe(30));
  it("SENIOR = 35",       () => expect(HOURLY_RATES.SENIOR).toBe(35));
  it("ESPECIALISTA = 45", () => expect(HOURLY_RATES.ESPECIALISTA).toBe(45));

  // Suporte — sempre 0
  it("SUPORTE_JUNIOR = 0",       () => expect(HOURLY_RATES.SUPORTE_JUNIOR).toBe(0));
  it("SUPORTE_PLENO = 0",        () => expect(HOURLY_RATES.SUPORTE_PLENO).toBe(0));
  it("SUPORTE_SENIOR = 0",       () => expect(HOURLY_RATES.SUPORTE_SENIOR).toBe(0));
  it("SUPORTE_ESPECIALISTA = 0", () => expect(HOURLY_RATES.SUPORTE_ESPECIALISTA).toBe(0));

  // Arquiteto — mesma tabela do desenvolvedor
  it("ARQUITETO_JUNIOR = 25",       () => expect(HOURLY_RATES.ARQUITETO_JUNIOR).toBe(25));
  it("ARQUITETO_PLENO = 30",        () => expect(HOURLY_RATES.ARQUITETO_PLENO).toBe(30));
  it("ARQUITETO_SENIOR = 35",       () => expect(HOURLY_RATES.ARQUITETO_SENIOR).toBe(35));
  it("ARQUITETO_ESPECIALISTA = 45", () => expect(HOURLY_RATES.ARQUITETO_ESPECIALISTA).toBe(45));
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
  it("WORKER_PROFILE_LABELS covers dev profiles", () => {
    expect(WORKER_PROFILE_LABELS.JUNIOR).toBe("Júnior");
    expect(WORKER_PROFILE_LABELS.PLENO).toBe("Pleno");
    expect(WORKER_PROFILE_LABELS.SENIOR).toBe("Sênior");
    expect(WORKER_PROFILE_LABELS.ESPECIALISTA).toBe("Especialista");
  });

  it("WORKER_PROFILE_LABELS covers suporte profiles", () => {
    expect(WORKER_PROFILE_LABELS.SUPORTE_JUNIOR).toBe("Suporte Júnior");
    expect(WORKER_PROFILE_LABELS.SUPORTE_PLENO).toBe("Suporte Pleno");
    expect(WORKER_PROFILE_LABELS.SUPORTE_SENIOR).toBe("Suporte Sênior");
    expect(WORKER_PROFILE_LABELS.SUPORTE_ESPECIALISTA).toBe("Suporte Especialista");
  });

  it("WORKER_PROFILE_LABELS covers arquiteto profiles", () => {
    expect(WORKER_PROFILE_LABELS.ARQUITETO_JUNIOR).toBe("Arquiteto Júnior");
    expect(WORKER_PROFILE_LABELS.ARQUITETO_PLENO).toBe("Arquiteto Pleno");
    expect(WORKER_PROFILE_LABELS.ARQUITETO_SENIOR).toBe("Arquiteto Sênior");
    expect(WORKER_PROFILE_LABELS.ARQUITETO_ESPECIALISTA).toBe("Arquiteto Especialista");
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

  // Suporte — sempre zero independente de horas/complexidade/ROI
  it("SUPORTE_JUNIOR × qualquer configuração = 0", () => {
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "SUPORTE_JUNIOR", estimatedHours: 100, complexity: "CRITICA", roi: "ESTRATEGICO",
    });
    expect(estimatedValue).toBe(0);
  });

  it("SUPORTE_ESPECIALISTA × qualquer configuração = 0", () => {
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "SUPORTE_ESPECIALISTA", estimatedHours: 200, complexity: "ALTA", roi: "ALTO",
    });
    expect(estimatedValue).toBe(0);
  });

  // Arquiteto — mesma fórmula do desenvolvedor equivalente
  it("ARQUITETO_JUNIOR = JUNIOR para mesmos parâmetros", () => {
    const dev = calculateDemandEstimatedValue({
      workerProfile: "JUNIOR", estimatedHours: 10, complexity: "BAIXA", roi: "BAIXO",
    });
    const arq = calculateDemandEstimatedValue({
      workerProfile: "ARQUITETO_JUNIOR", estimatedHours: 10, complexity: "BAIXA", roi: "BAIXO",
    });
    expect(arq.estimatedValue).toBe(dev.estimatedValue);
  });

  it("ARQUITETO_ESPECIALISTA × 80h × CRITICA/ESTRATEGICO = 7200", () => {
    // 45 × 80 × 2.0 = 7200
    const { estimatedValue } = calculateDemandEstimatedValue({
      workerProfile: "ARQUITETO_ESPECIALISTA", estimatedHours: 80, complexity: "CRITICA", roi: "ESTRATEGICO",
    });
    expect(estimatedValue).toBe(7200);
  });
});

// ── PROFILE_GROUPS ──────────────────────────────────────────────────────────

describe("PROFILE_GROUPS", () => {
  it("tem exatamente 3 grupos", () => {
    expect(PROFILE_GROUPS).toHaveLength(3);
  });

  it("grupo Desenvolvedor tem 4 perfis", () => {
    const dev = PROFILE_GROUPS.find((g) => g.label === "Desenvolvedor");
    expect(dev?.profiles).toHaveLength(4);
    expect(dev?.profiles).toContain("JUNIOR");
    expect(dev?.profiles).toContain("ESPECIALISTA");
  });

  it("grupo Suporte tem 4 perfis com taxa 0", () => {
    const suporte = PROFILE_GROUPS.find((g) => g.label === "Suporte");
    expect(suporte?.profiles).toHaveLength(4);
    suporte?.profiles.forEach((p) => expect(HOURLY_RATES[p]).toBe(0));
  });

  it("grupo Arquiteto tem 4 perfis com mesmas taxas do Desenvolvedor", () => {
    const arq = PROFILE_GROUPS.find((g) => g.label === "Arquiteto");
    expect(arq?.profiles).toHaveLength(4);
    expect(HOURLY_RATES.ARQUITETO_JUNIOR).toBe(HOURLY_RATES.JUNIOR);
    expect(HOURLY_RATES.ARQUITETO_PLENO).toBe(HOURLY_RATES.PLENO);
    expect(HOURLY_RATES.ARQUITETO_SENIOR).toBe(HOURLY_RATES.SENIOR);
    expect(HOURLY_RATES.ARQUITETO_ESPECIALISTA).toBe(HOURLY_RATES.ESPECIALISTA);
  });

  it("todos os 12 perfis têm label definido", () => {
    const allProfiles = PROFILE_GROUPS.flatMap((g) => g.profiles);
    expect(allProfiles).toHaveLength(12);
    allProfiles.forEach((p) => {
      expect(WORKER_PROFILE_LABELS[p]).toBeTruthy();
    });
  });
});
