# Gestor de Demandas — Guia de Deploy em Produção

## Pré-requisitos no servidor

| Requisito | Versão mínima | Como instalar |
|-----------|--------------|---------------|
| Node.js   | 20 LTS       | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| PM2       | latest       | `npm install -g pm2` |
| Nginx     | latest       | `sudo apt install nginx` |
| Certbot   | latest       | `sudo apt install certbot python3-certbot-nginx` |

---

## Estrutura do pacote

```
comissionamento-prod-v*.zip
├── .next/
│   ├── standalone/        ← servidor Node.js autocontido
│   └── static/            ← assets estáticos (JS, CSS, imagens)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── deploy/
│   ├── ecosystem.config.js   ← configuração PM2
│   ├── nginx.conf.example    ← configuração Nginx
│   ├── .env.production       ← template de variáveis (PREENCHER!)
│   ├── deploy.sh             ← script automático de deploy
│   └── LEIAME-DEPLOY.md      ← este arquivo
└── package.json
```

---

## Deploy rápido (automático)

```bash
# 1. Subir o pacote para o servidor (exemplo com SCP)
scp comissionamento-prod-v*.zip usuario@servidor:/tmp/

# 2. No servidor: descompactar e executar
ssh usuario@servidor
cd /tmp
unzip comissionamento-prod-v*.zip -d comissionamento-deploy
cd comissionamento-deploy
bash deploy.sh
```

O script `deploy.sh` faz automaticamente:
- Verifica Node.js e PM2
- Copia os arquivos para `/var/www/gestor-demandas`
- Solicita configuração do `.env` na primeira vez
- Roda `prisma migrate deploy` para atualizar o banco
- Inicia/reinicia a aplicação via PM2

---

## Deploy manual (passo a passo)

### 1. Criar diretório e copiar arquivos

```bash
APP_DIR="/var/www/gestor-demandas"
mkdir -p $APP_DIR /var/log/pm2

cp -r .next/standalone/. $APP_DIR/
mkdir -p $APP_DIR/.next/static
cp -r .next/static/.     $APP_DIR/.next/static/
mkdir -p $APP_DIR/prisma
cp prisma/schema.prisma  $APP_DIR/prisma/
cp -r prisma/migrations/ $APP_DIR/prisma/
cp deploy/ecosystem.config.js $APP_DIR/
```

### 2. Configurar variáveis de ambiente

```bash
cp deploy/.env.production $APP_DIR/.env
nano $APP_DIR/.env        # preencha todos os valores reais
```

Valores obrigatórios:
- `DATABASE_URL` — connection string Supabase (pooler, porta 6543)
- `DIRECT_URL` — connection string direta (porta 5432)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` — URL pública da aplicação (ex: `https://gestor.empresa.com.br`)
- `ALLOWED_ORIGINS` — domínio(s) para Server Actions (ex: `gestor.empresa.com.br`)

### 3. Aplicar migrations

```bash
cd $APP_DIR
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### 4. Iniciar com PM2

```bash
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # ativa reinício automático após reboot
```

### 5. Configurar Nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/gestor-demandas
sudo nano /etc/nginx/sites-available/gestor-demandas  # ajuste o domínio
sudo ln -s /etc/nginx/sites-available/gestor-demandas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. SSL com Let's Encrypt

```bash
sudo certbot --nginx -d seu-dominio.com.br
```

---

## Atualização de versão

```bash
# 1. Subir novo pacote e descompactar em /tmp
# 2. Parar o app
pm2 stop gestor-demandas

# 3. Fazer backup da pasta atual
cp -r /var/www/gestor-demandas /var/www/gestor-demandas.bak

# 4. Copiar novos arquivos (mantém o .env existente)
cp -r .next/standalone/. /var/www/gestor-demandas/
cp -r .next/static/.     /var/www/gestor-demandas/.next/static/

# 5. Aplicar migrations
cd /var/www/gestor-demandas
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 6. Reiniciar
pm2 restart gestor-demandas
```

---

## Comandos úteis PM2

```bash
pm2 status                    # estado dos processos
pm2 logs gestor-demandas      # logs em tempo real
pm2 logs gestor-demandas --lines 200  # últimas 200 linhas
pm2 restart gestor-demandas   # reiniciar
pm2 stop gestor-demandas      # parar
pm2 monit                     # monitor visual
```

---

## Supabase — Configurações necessárias

No painel do Supabase, em **Authentication > URL Configuration**:

- **Site URL**: `https://seu-dominio.com.br`
- **Redirect URLs**: `https://seu-dominio.com.br/api/auth/callback`

Em **Storage**, o bucket `evidence-images` deve existir com política de acesso adequada.

---

## Versão

- App: `gestor-demandas-tecnicas@0.2.0`
- Next.js: 15.x (standalone output)
- Node.js recomendado: 20 LTS
