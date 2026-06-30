#!/usr/bin/env bash
# =============================================================
# deploy-develop.sh — build + restart no servidor de teste
# Chamado pelo GitHub Actions (.github/workflows/deploy-develop.yml)
# APÓS o workflow já ter feito git fetch/checkout/reset na develop.
# Tambem pode ser rodado manualmente no servidor:
#   bash deploy/deploy-develop.sh
# =============================================================
set -euo pipefail

APP_NAME="${APP_NAME:-comissionamento}"
APP_DIR="${APP_DIR:-/var/www/comissionamento}"
SRC_DIR="${SRC_DIR:-/var/www/_src/comissionamento}"
PORT="${PORT:-3001}"

cd "$SRC_DIR"

echo "==> [1/6] npm ci"
npm ci

echo "==> [2/6] carregar env (CRLF normalizado, NODE_ENV fora do ambiente)"
if [ ! -f .env.local ]; then
  echo "ERRO: $SRC_DIR/.env.local nao existe. Crie-o antes do primeiro deploy." >&2
  exit 1
fi
sed -i 's/\r$//' .env.local
set -a; . ./.env.local; set +a
unset NODE_ENV   # critico: NODE_ENV no ambiente quebra o build standalone

echo "==> [3/6] prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "==> [4/6] build standalone (limpo)"
rm -rf .next
npm run build

echo "==> [5/6] montar runtime em $APP_DIR"
mkdir -p "$APP_DIR"
# standalone (preserva .env* que porventura existam no APP_DIR)
rsync -a --delete --exclude='.env' --exclude='.env.local' .next/standalone/ "$APP_DIR/"
mkdir -p "$APP_DIR/.next/static"
rsync -a --delete .next/static/ "$APP_DIR/.next/static/"
mkdir -p "$APP_DIR/prisma"
cp prisma/schema.prisma "$APP_DIR/prisma/"
rsync -a --delete prisma/migrations/ "$APP_DIR/prisma/migrations/"

echo "==> [6/6] (re)start pm2 na porta $PORT"
cd "$APP_DIR"
set -a; . "$SRC_DIR/.env.local"; set +a
unset NODE_ENV
export PORT
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start "$APP_DIR/server.js" --name "$APP_NAME"
fi
pm2 save

echo "==> health check http://localhost:$PORT"
sleep 2
if curl -fsS -I "http://localhost:$PORT" > /dev/null; then
  echo "OK: app respondendo na porta $PORT"
else
  echo "FALHOU health check — ultimos logs:" >&2
  pm2 logs "$APP_NAME" --lines 40 --nostream || true
  exit 1
fi
