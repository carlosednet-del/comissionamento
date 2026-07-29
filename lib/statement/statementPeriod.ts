/**
 * Regras de período e janela de assinatura do extrato.
 *
 * Mês de referência N (ex: Julho):
 *   - Período de demandas : dia 16 do mês N-1  →  dia 15 do mês N
 *   - Janela de assinatura: dia 16 do mês N     →  dia 25 do mês N
 */

export function periodBounds(month: number, year: number) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;

  return {
    gte: new Date(prevYear, prevMonth - 1, 16, 0,  0,  0,   0),  // 16 do mês anterior
    lte: new Date(year,     month  - 1,   15, 23, 59, 59, 999),  // 15 do mês atual
  };
}

export function signingWindow(month: number, year: number) {
  // Exceção: julho/2026 prazo estendido até dia 30
  const closeDay = (month === 7 && year === 2026) ? 30 : 25;
  return {
    open:  new Date(year, month - 1, 16, 0,  0,  0,   0),
    close: new Date(year, month - 1, closeDay, 23, 59, 59, 999),
  };
}

export function isSigningWindowOpen(month: number, year: number, now = new Date()): boolean {
  const { open, close } = signingWindow(month, year);
  return now >= open && now <= close;
}
