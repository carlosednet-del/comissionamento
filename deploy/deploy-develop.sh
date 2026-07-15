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

echo "==> [1/7] npm ci"
npm ci

echo "==> [2/7] carregar env (CRLF normalizado, NODE_ENV fora do ambiente)"
if [ ! -f .env.local ]; then
  echo "ERRO: $SRC_DIR/.env.local nao existe. Crie-o antes do primeiro deploy." >&2
  exit 1
fi
sed -i 's/\r$//' .env.local
set -a; . ./.env.local; set +a
unset NODE_ENV   # critico: NODE_ENV no ambiente quebra o build standalone

echo "==> [3/7] prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "==> [4/7] build standalone (limpo)"
rm -rf .next
npm run build

echo "==> [5/7] montar runtime em $APP_DIR"
mkdir -p "$APP_DIR"
# standalone (preserva .env* que porventura existam no APP_DIR)
rsync -a --delete --exclude='.env' --exclude='.env.local' --exclude='ecosystem.config.js' .next/standalone/ "$APP_DIR/"
mkdir -p "$APP_DIR/.next/static"
rsync -a --delete .next/static/ "$APP_DIR/.next/static/"
mkdir -p "$APP_DIR/prisma"
cp prisma/schema.prisma "$APP_DIR/prisma/"
rsync -a --delete prisma/migrations/ "$APP_DIR/prisma/migrations/"

echo "==> [6/7] gerar ecosystem.config.js com variaveis de ambiente"
# Gera o arquivo de configuracao do PM2 com todas as vars do .env.local
# injetadas estaticamente — assim pm2 reload/restart sempre tem o env correto.
node -e "
const fs = require('fs');
const env = {};
// copia todas as vars do processo atual (carregadas do .env.local pelo set -a)
for (const [k, v] of Object.entries(process.env)) {
  if (v !== undefined) env[k] = v;
}
// garante vars criticas
env.PORT = '${PORT}';
env.HOSTNAME = '0.0.0.0';
env.NODE_ENV = 'production';
const config = {
  apps: [{
    name: '${APP_NAME}',
    script: './server.js',
    cwd: '${APP_DIR}',
    env,
  }]
};
fs.writeFileSync('${APP_DIR}/ecosystem.config.js', 'module.exports = ' + JSON.stringify(config, null, 2));
console.log('ecosystem.config.js gerado com', Object.keys(env).length, 'variaveis');
"

echo "==> [7/7] (re)start pm2 via ecosystem.config.js na porta $PORT"
cd "$APP_DIR"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
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
