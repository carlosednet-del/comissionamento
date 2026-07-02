export const DEPARTMENTS = [
  "Administrativo",
  "AGEHAB",
  "Assistência Técnica",
  "Cobrança",
  "Comercial",
  "Contabilidade",
  "Crédito",
  "Desenvolvimento Imobiliário",
  "Diretoria",
  "Engenharia",
  "Experiência do Cliente (CX)",
  "Financeiro",
  "Financiamento a Produção",
  "FP&A",
  "Gente e Cultura",
  "Gestão de Despesas",
  "Inovação e Tecnologia",
  "Jurídico",
  "Marketing",
  "Novos Negócios",
  "Obra",
  "Orçamento, Planejamento e Controle",
  "Processos",
  "Qualidade",
  "Secretaria de Vendas",
  "SESMT",
  "Suprimentos",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DIRECTORS = ["Gabriel", "Lucelia", "Marco"] as const;
export type Director = (typeof DIRECTORS)[number];

export const AREA_DIRECTOR_MAP: Record<string, Director> = {
  "Administrativo":                  "Lucelia",
  "AGEHAB":                          "Gabriel",
  "Assistência Técnica":             "Gabriel",
  "Cobrança":                        "Lucelia",
  "Comercial":                       "Marco",
  "Contabilidade":                   "Gabriel",
  "Crédito":                         "Gabriel",
  "Desenvolvimento Imobiliário":     "Marco",
  "Diretoria":                       "Gabriel",
  "Engenharia":                      "Gabriel",
  "Experiência do Cliente (CX)":     "Lucelia",
  "Financeiro":                      "Gabriel",
  "Financiamento a Produção":        "Gabriel",
  "FP&A":                            "Gabriel",
  "Gente e Cultura":                 "Lucelia",
  "Gestão de Despesas":              "Gabriel",
  "Inovação e Tecnologia":           "Marco",
  "Jurídico":                        "Lucelia",
  "Marketing":                       "Marco",
  "Novos Negócios":                  "Marco",
  "Obra":                            "Lucelia",
  "Orçamento, Planejamento e Controle": "Gabriel",
  "Processos":                       "Lucelia",
  "Qualidade":                       "Gabriel",
  "Secretaria de Vendas":            "Marco",
  "SESMT":                           "Gabriel",
  "Suprimentos":                     "Gabriel",
};

export function getAreasByDirector(director: string): string[] {
  return Object.entries(AREA_DIRECTOR_MAP)
    .filter(([, d]) => d === director)
    .map(([area]) => area);
}
