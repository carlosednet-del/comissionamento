#!/usr/bin/env bash
# =============================================================
# deploy-develop.sh — build + restart no servidor de teste
# Chamado pelo GitHub Actions (.github/workflows/deploy-develop.yml)
# APOS o workflow ja ter feito git fetch/checkout/reset na develop.
# Tambem pode ser rodado manualmente no servidor:
#   bash deploy/deploy-develop.sh
#
# MODELO PASTA UNICA:
#   Buildar e rodar tudo em SRC_DIR. O app sobe via `next start`, que
#   carrega o .env.local nativamente em runtime. Nao existe mais copia
#   para /var/www/comissionamento nem ecosystem gerado com env injetado.
# =============================================================
set -euo pipefail

APP_NAME="${APP_NAME:-comissionamento}"
SRC_DIR="${SRC_DIR:-/var/www/_src/comissionamento}"
PORT="${PORT:-3001}"

cd "$SRC_DIR"

echo "==> [1/6] npm ci"
npm ci

echo "==> [2/6] validar .env.local (CRLF normalizado)"
if [ ! -f .env.local ]; then
  echo "ERRO: $SRC_DIR/.env.local nao existe. Crie-o antes do primeiro deploy." >&2
  exit 1
fi
sed -i 's/\r$//' .env.local
# Vars criticas que o app precisa em runtime (NextAuth). Falha cedo se faltarem.
for var in AUTH_SECRET AUTH_URL AUTH_MICROSOFT_ENTRA_ID_ISSUER; do
  if ! grep -qE "^${var}=" .env.local; then
    echo "AVISO: ${var} nao encontrado em .env.local" >&2
  fi
done

echo "==> [3/6] prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "==> [4/6] build (limpo)"
# Blindagem: NODE_ENV herdado no ambiente pode quebrar o `next build`.
# Nao sourçamos o .env.local (Next/Prisma leem sozinhos em runtime).
unset NODE_ENV || true
rm -rf .next
npm run build

echo "==> [5/6] gerar ecosystem.config.js (pasta unica; next start le o .env.local)"
cat > "$SRC_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [{
    name: "${APP_NAME}",
    cwd: "${SRC_DIR}",
    script: "node_modules/next/dist/bin/next",
    args: "start -p ${PORT}",
    env: { NODE_ENV: "production" }
  }]
}
EOF

echo "==> [6/6] (re)start pm2 na porta $PORT"
# Recria sempre a partir do ecosystem: garante que cwd/script/porta sejam
# exatamente os do arquivo (pm2 restart reaproveitaria a definicao antiga).
pm2 delete "$APP_NAME" > /dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save

echo "==> health check http://localhost:$PORT"
sleep 3
if curl -fsS -I "http://localhost:$PORT" > /dev/null; then
  echo "OK: app respondendo na porta $PORT"
else
  echo "FALHOU health check — ultimos logs:" >&2
  pm2 logs "$APP_NAME" --lines 40 --nostream || true
  exit 1
fi
