#!/usr/bin/env bash
# =============================================================
# deploy-main.sh — deploy de PRODUCAO (modelo `next start`)
# Chamado pelo GitHub Actions (.github/workflows/deploy-main.yml)
# APOS o workflow ja ter feito git fetch/checkout/reset na main.
# Tambem roda manual no servidor de prod:  bash deploy/deploy-main.sh
#
# Difere do deploy de teste: prod NAO usa standalone; roda a arvore
# completa com `npm run start` (next start) na porta 3001.
# NAO faz `source` do .env — Next e Prisma carregam o .env sozinhos.
# =============================================================
set -euo pipefail

APP_NAME="${APP_NAME:-comissionamento}"
APP_DIR="${APP_DIR:-/var/www/comissionamento}"
PORT="${PORT:-3001}"
export PORT   # pm2 restart --update-env precisa ver o PORT para o next start ligar na 3001

cd "$APP_DIR"

# Blindagem: NODE_ENV no ambiente pode quebrar o `next build`.
# Nao sourçamos o .env (Next/Prisma leem sozinhos); so garantimos
# que nada herdado contamine o build.
unset NODE_ENV || true
# normaliza CRLF do .env (sem ler para o shell)
[ -f .env ] && sed -i 's/\r$//' .env

echo "==> [1/5] npm ci"
npm ci

echo "==> [2/5] prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "==> [3/5] build (limpo)"
rm -rf .next
npm run build

echo "==> [4/5] restart pm2 ($APP_NAME) na porta $PORT"
pm2 restart "$APP_NAME" --update-env
pm2 save

echo "==> [5/5] health check http://localhost:$PORT"
sleep 3
if curl -fsS -I "http://localhost:$PORT" > /dev/null; then
  echo "OK: prod respondendo na porta $PORT"
else
  echo "FALHOU health check — ultimos logs:" >&2
  pm2 logs "$APP_NAME" --lines 40 --nostream || true
  exit 1
fi
