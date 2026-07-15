# Runbook — Deploy de TESTE (branch `develop`)

> Ambiente de **teste/homologação**. Deploy **automático** a cada push/merge na `develop`.
> Para produção, ver `RUNBOOK-PRODUCAO.md` (é um fluxo separado).

## Ambiente

| Item | Valor |
|------|-------|
| Branch | `develop` |
| Servidor | `162.243.208.177` (usuário `root`) |
| URL | https://devvariavelit.7lm.app.br |
| Porta | `3001` |
| Processo pm2 | `comissionamento` |
| Pasta de build **e** runtime | `/var/www/_src/comissionamento` (pasta única) |
| Modelo de execução | **`next start`** (lê o `.env.local` nativamente em runtime) |
| Workflow | `.github/workflows/deploy-develop.yml` |
| Script | `deploy/deploy-develop.sh` |

## Como funciona

1. Push/merge na `develop` dispara o workflow (GitHub Actions).
2. A Action conecta por SSH no servidor (`appleboy/ssh-action`).
3. No servidor: `git fetch` + `reset --hard origin/develop` → `bash deploy/deploy-develop.sh`.
4. O script: `npm ci` → export do `.env.local` (o Prisma CLI só lê `.env`) → `prisma generate` +
   `migrate deploy` → `build` → gera `ecosystem.config.js` (cwd no `_src`) → `pm2 delete`+`start`
   → health check `:3001`. Não há mais cópia para `/var/www/comissionamento`.

Sem gate de aprovação — o merge já publica no teste.

## Fluxo do desenvolvedor

```bash
git checkout develop && git pull
git checkout -b feat/minha-feature
# ...codar, commitar...
git push -u origin feat/minha-feature
```
Abrir PR com base em `develop` → revisar → **merge**. Em ~1–2 min está no ar.

### Mudou o schema do Prisma?
```bash
npx prisma migrate dev --name descricao   # gera prisma/migrations/...
git add prisma/migrations                 # commitar junto
```
No deploy, `migrate deploy` aplica as migrations pendentes no banco de teste.

### Variável de ambiente nova?
Fica no `.env.local` **do servidor** (`/var/www/_src/comissionamento/.env.local`) — não vai pro git.
Adicione a linha no servidor **antes** de mergear. **Nunca** colocar `NODE_ENV` no `.env.local`.

## Acompanhar o deploy

- GitHub → aba **Actions** → workflow "Deploy develop (servidor de teste)".
- CLI: `gh run watch -R lucianocandido7lm/variavaelit`
- Verde = publicado. Vermelho = falhou (app anterior continua no ar).

## Deploy manual (sem push)

Pela UI: Actions → "Deploy develop" → **Run workflow** → branch `develop`.
Ou direto no servidor:
```bash
export SRC_DIR=/var/www/_src/comissionamento APP_DIR=/var/www/comissionamento APP_NAME=comissionamento PORT=3001
cd "$SRC_DIR" && git fetch origin && git checkout -f develop && git reset --hard origin/develop
bash deploy/deploy-develop.sh
```

## Verificação

```bash
pm2 status                                  # comissionamento online (:3001)
curl -I http://localhost:3001               # 200 ou 307 -> /login
curl -I https://devvariavelit.7lm.app.br    # externo, cert válido
pm2 logs comissionamento --lines 50 --nostream
```

## Rollback

```bash
# Voltar para o commit anterior da develop (ex.: reverter o último merge)
cd /var/www/_src/comissionamento
git reset --hard <sha_anterior>
bash deploy/deploy-develop.sh
```
Ou reverter o commit na `develop` (git revert) e deixar o auto-deploy publicar.

## Troubleshooting

- **Build falha com `<Html> should not be imported outside of pages/_document`**
  → `NODE_ENV` está no ambiente. Garanta que `.env.local` não tem `NODE_ENV` e que o script
  faz `unset NODE_ENV` (já faz). Exige também `app/not-found.tsx` + `app/global-error.tsx`.
- **`connection refused` na 3001** → app não subiu; ver `pm2 logs comissionamento`.
- **Erro de Prisma engine/conexão** → checar `DATABASE_URL`/`DIRECT_URL` no `.env.local` do servidor.
- **`ERR_TOO_MANY_REDIRECTS` no navegador** → cookie de sessão antigo; testar em janela anônima / limpar cookies do domínio.

## Infra / segredos (referência)

- Secrets do repo: `DEPLOY_HOST` (162.243.208.177), `DEPLOY_USER` (root), `DEPLOY_SSH_KEY`.
- A chave pública (`github-actions-deploy-comissionamento`) está no `~/.ssh/authorized_keys` do root.
  Revogar acesso = remover essa linha.
- O clone puxa via origin `git@github-comissionamento` (deploy key read-only).
