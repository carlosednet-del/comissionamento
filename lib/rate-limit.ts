/**
 * Rate limiter em memória por chave (ex.: "login:<ip>").
 *
 * Limitação: cada instância de processo tem seu próprio estado.
 * Em ambientes serverless com múltiplas instâncias paralelas o
 * contador não é compartilhado — o bloqueio é por instância, não global.
 * Para proteção global use Redis (Upstash) em produção.
 */

const WINDOW_MS   = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;
const MAX_KEYS    = 10_000;           // limite de entradas para evitar uso ilimitado de memória

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function purgeExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkLoginRateLimit(key: string): {
  limited: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();

  if (store.size > MAX_KEYS) purgeExpired();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: MAX_ATTEMPTS - 1, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { limited: true, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { limited: false, remaining: MAX_ATTEMPTS - entry.count, retryAfterMs: 0 };
}

export function resetLoginRateLimit(key: string): void {
  store.delete(key);
}
