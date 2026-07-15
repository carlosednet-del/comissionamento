# Runbook — Deploy de PRODUÇÃO (branch `main`)

> Ambiente de **produção**. Deploy disparado por push/merge na `main`, **com gate de
> aprovação manual** (GitHub Environment `production`). Para teste, ver `RUNBOOK-DEVELOP.md`.
>
> Domínio: **variavelit.7lm.app.br** · App do Azure: **o mesmo do teste** (`dc4c0577-…`).

## Ambiente

| Item | Valor |
|------|-------|
| Branch | `main` |
| Servidor | secret `PROD_DEPLOY_HOST` (usuário `PROD_DEPLOY_USER`) |
| URL | https://`variavelit.7lm.app.br` |
| Porta | `3001` |
| Processo pm2 | `comissionamento` |
| Pasta de build **e** runtime | `/var/www/comissionamento` (pasta única) |
| Modelo de execução | **`next start`** (lê `.env` nativamente em runtime) |
| Arquivo de env | `/var/www/comissionamento/.env` (⚠️ **`.env`**, não `.env.local`) |
| Workflow | `.github/workflows/deploy-main.yml` |
| Script | `deploy/deploy-main.sh` |

> Diferença-chave vs teste: produção usa **`.env`** (Prisma e Next leem sozinhos), então
> o `deploy-main.sh` **não** faz `source` do arquivo. Não existe pasta `_src` em produção.

---

## Objetivo deste deploy

Levar para produção o que já foi validado em teste:
1. Remoção de `output: standalone` (`next.config.ts`) → `next start` limpo, sem warning.
2. **Login Microsoft Entra ID** funcionando (exige variáveis novas no `.env` de prod + Redirect URI no Azure).

---

## Fase 0 — Pré-requisitos (fazer antes de tudo)

- [ ] Confirmar que o `.env` de prod já tem `DATABASE_URL`, `DIRECT_URL` e um `AUTH_SECRET` forte
      (**distinto** do de teste). Gerar um novo se necessário: `openssl rand -base64 32`.
- [ ] Confirmar quem é o revisor aprovador do Environment `production` no GitHub.
- [ ] Ter o **client secret Value** do app do Azure em mãos (o mesmo do `.env.local` de teste).

## Fase 1 — Azure (antes do deploy)

Reaproveitando o **mesmo app** do teste (`dc4c0577-4e8a-46b8-9953-f0bfd24ca568`,
tenant `65d94465-e0c0-422c-bd51-6eff1e60fe3e`) — basta **acrescentar** o callback de prod.

- [ ] Portal do Azure → **Microsoft Entra ID → App registrations** → abrir o app `dc4c0577-…`.
- [ ] **Authentication → Redirect URIs (tipo Web)** → **adicionar** (mantendo o de teste):
      ```
      https://variavelit.7lm.app.br/api/auth/callback/microsoft-entra-id
      ```
- [ ] **Certificates & secrets** → confirmar que o secret **não está expirado**.

## Fase 2 — Variáveis de ambiente no servidor de produção (antes do merge)

SSH no servidor de produção e editar `/var/www/comissionamento/.env`. **Adicionar/conferir**
(valores do mesmo app; só o `SECRET` você preenche com o Value):

```env
# NextAuth / Entra ID
AUTH_URL=https://variavelit.7lm.app.br            # com https://, SEM barra no final
AUTH_TRUST_HOST=true

AUTH_MICROSOFT_ENTRA_ID_ID=dc4c0577-4e8a-46b8-9953-f0bfd24ca568
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client secret VALUE do mesmo app>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/65d94465-e0c0-422c-bd51-6eff1e60fe3e/v2.0
```
> `AUTH_SECRET` já deve existir no `.env` de prod (sessões atuais). **Não** troque sem necessidade.

⚠️ **Erros que já nos custaram horas — evitar:**
- `AUTH_URL` **sem** `https://` → `TypeError: Invalid URL` → botão "não faz nada".
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER` como **só o tenant id** (GUID solto) → mesmo erro.
  Tem que ser a **URL completa** terminando em `/v2.0`.
- Linha duplicada de `AUTH_URL`.

**Validar que o Next vai enxergar (lê exatamente como o `next start`):**
```bash
cd /var/www/comissionamento
node -e "require('@next/env').loadEnvConfig(process.cwd(), false); \
  console.log('AUTH_URL=['+process.env.AUTH_URL+']'); \
  console.log('ISSUER=['+process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER+']')"
```
Ambos têm que sair como **URL completa começando com `https://`**.

- [ ] Confirmar que os usuários que vão logar via Microsoft **existem e estão ativos** na tabela
      `user` do banco de **produção** — senão o login cai em `/sem-perfil` (ver `auth.ts`).

## Fase 3 — Levar o código para a `main`

O `.env` já foi preparado no servidor; agora publica-se o código.

```bash
git checkout main && git pull
git merge --no-ff develop          # traz next.config + scripts já validados em teste
# resolver conflitos se houver, revisar o diff
git push origin main               # dispara o workflow (aguarda aprovação)
```
> Alternativa: abrir PR `develop → main`, revisar e mergear pela UI.

## Fase 4 — Aprovar e acompanhar o deploy

1. GitHub → **Actions** → "Deploy main (producao)" → o run fica **aguardando aprovação**.
2. Revisor aprova o Environment `production`.
3. O job roda: SSH → `git reset --hard origin/main` → `bash deploy/deploy-main.sh`
   (`npm ci` → `prisma generate` + `migrate deploy` → `build` → `pm2 restart` → health `:3001`).
4. Acompanhar: `gh run watch -R lucianocandido7lm/variavaelit` (verde = publicado).

## Fase 5 — Verificação pós-deploy

```bash
# no servidor
pm2 status                                    # comissionamento online (:3001)
curl -I http://localhost:3001                 # 200 ou 307 -> /login
curl -I https://variavelit.7lm.app.br                 # externo, cert válido
pm2 logs comissionamento --lines 50 --nostream   # SEM "Invalid URL" / "Configuration"
```

**Estático (nginx):** em prod o `alias /_next/static/` deve apontar para
`/var/www/comissionamento/.next/static/` — que é a **mesma** pasta de build/runtime, então
está correto e atualiza a cada deploy. Se um usuário vir "Loading chunk failed" logo após o
deploy, é **aba velha**: hard refresh (Ctrl+Shift+R). Só investigar se persistir após o refresh.

**Login Microsoft (teste de fumaça):** abrir `https://variavelit.7lm.app.br/login`, clicar
"Entrar com Microsoft" → deve redirecionar para a tela da Microsoft (sem `AADSTS50011`) e,
após autenticar com um usuário válido, voltar logado.

## Fase 6 — Rollback

```bash
# no servidor de produção
cd /var/www/comissionamento
git reset --hard <sha_anterior_estavel>
bash deploy/deploy-main.sh
```
Ou `git revert <sha>` na `main` e deixar o deploy (com aprovação) republicar.
Reverter só o `.env` (ex.: comentar as vars do Entra) **não** exige rebuild: basta
`pm2 restart comissionamento` para reler o arquivo.

## Troubleshooting (específico de prod)

- **Botão Microsoft não faz nada / `?error=Configuration`** → `AUTH_URL` ou `ISSUER`
  malformado no `.env`. Rodar o teste `loadEnvConfig` da Fase 2.
- **`AADSTS50011` na tela da Microsoft** → Redirect URI de prod não cadastrado (Fase 1).
- **Cai em `/sem-perfil`** → usuário não existe/ativo no banco de prod.
- **Build falha `<Html> should not be imported...`** → `NODE_ENV` no ambiente; o
  `deploy-main.sh` já faz `unset NODE_ENV`.
- **`pm2 restart` não pega mudança de configuração** → recriar o processo:
  `pm2 delete comissionamento && cd /var/www/comissionamento && pm2 start "node_modules/next/dist/bin/next" --name comissionamento -- start -p 3001 && pm2 save`.

## Infra / segredos (referência)

- Secrets do repo: `PROD_DEPLOY_HOST`, `PROD_DEPLOY_USER`, `PROD_DEPLOY_SSH_KEY`, `PROD_DEPLOY_PORT`.
- Gate: GitHub → Settings → Environments → `production` (revisor obrigatório).
- Segredos de app (`AUTH_*`, `DATABASE_URL`) vivem **só** no `.env` do servidor — nunca no git.
