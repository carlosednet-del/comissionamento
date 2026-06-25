#!/bin/bash
# =============================================================
# deploy.sh — Script de deploy/atualização no servidor
# Uso: bash deploy.sh
# Execute este script no servidor, dentro da pasta do pacote
# =============================================================

set -e

APP_DIR="/var/www/gestor-demandas"
APP_NAME="gestor-demandas"

echo "============================================"
echo " GESTOR DE DEMANDAS — Deploy v$(date +%Y%m%d-%H%M%S)"
echo "============================================"

# ------------------------------------------------------------
# 1. Verificar dependências
# ------------------------------------------------------------
echo ""
echo "[1/6] Verificando dependências..."
command -v node  >/dev/null 2>&1 || { echo "ERRO: Node.js não encontrado. Instale via NVM ou NodeSource."; exit 1; }
command -v pm2   >/dev/null 2>&1 || { echo "ERRO: PM2 não encontrado. Instale com: npm install -g pm2"; exit 1; }
echo "  Node: $(node -v) | PM2: $(pm2 -v)"

# ------------------------------------------------------------
# 2. Criar diretório da aplicação
# ------------------------------------------------------------
echo ""
echo "[2/6] Preparando diretório $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p /var/log/pm2

# ------------------------------------------------------------
# 3. Copiar arquivos do pacote standalone para APP_DIR
# ------------------------------------------------------------
echo ""
echo "[3/6] Copiando arquivos standalone..."

# Standalone server (gerado pelo next build com output: 'standalone')
cp -r .next/standalone/.  "$APP_DIR/"
# Arquivos estáticos
mkdir -p "$APP_DIR/.next/static"
cp -r .next/static/.      "$APP_DIR/.next/static/"
# Pasta public (se existir)
if [ -d "public" ]; then
  cp -r public/. "$APP_DIR/public/"
fi
# Prisma schema (necessário para Prisma Client em runtime)
mkdir -p "$APP_DIR/prisma"
cp -r prisma/schema.prisma "$APP_DIR/prisma/"
cp -r prisma/migrations/.  "$APP_DIR/prisma/migrations/" 2>/dev/null || true
# PM2 config
cp deploy/ecosystem.config.js "$APP_DIR/"

echo "  Arquivos copiados."

# ------------------------------------------------------------
# 4. Configurar variáveis de ambiente
# ------------------------------------------------------------
echo ""
echo "[4/6] Configurando .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f "deploy/.env.production" ]; then
    cp deploy/.env.production "$APP_DIR/.env"
    echo ""
    echo "  ⚠️  ATENÇÃO: Arquivo .env criado a partir do template."
    echo "  Edite $APP_DIR/.env com os valores reais antes de continuar!"
    echo ""
    read -p "  Pressione ENTER após editar o .env para continuar..." _
  else
    echo "  ERRO: deploy/.env.production não encontrado."
    exit 1
  fi
else
  echo "  .env já existe, mantendo configurações atuais."
fi

# Exportar variáveis para usar no migrate
export $(grep -v '^#' "$APP_DIR/.env" | xargs) 2>/dev/null

# ------------------------------------------------------------
# 5. Aplicar migrations do banco
# ------------------------------------------------------------
echo ""
echo "[5/6] Aplicando migrations no banco (prisma migrate deploy)..."
cd "$APP_DIR"
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "  Banco de dados atualizado."
cd -

# ------------------------------------------------------------
# 6. Iniciar/Reiniciar com PM2
# ------------------------------------------------------------
echo ""
echo "[6/6] Iniciando aplicação com PM2..."
cd "$APP_DIR"

if pm2 list | grep -q "$APP_NAME"; then
  echo "  Reiniciando instância existente..."
  pm2 restart "$APP_NAME"
else
  echo "  Iniciando nova instância..."
  pm2 start ecosystem.config.js
fi

pm2 save
echo "  Aplicação iniciada."

# ------------------------------------------------------------
# Resultado
# ------------------------------------------------------------
echo ""
echo "============================================"
echo " Deploy concluído com sucesso!"
echo "============================================"
echo ""
echo " App rodando em: http://localhost:3000"
echo " Logs PM2:       pm2 logs $APP_NAME"
echo " Status PM2:     pm2 status"
echo ""
echo " Próximos passos:"
echo "   1. Configure o Nginx (deploy/nginx.conf.example)"
echo "   2. Configure SSL com: sudo certbot --nginx -d seu-dominio.com.br"
echo "   3. pm2 startup  (para reiniciar após reboot do servidor)"
echo ""
