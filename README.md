# Gestor de Demandas Técnicas

Ferramenta interna para criação, gestão, aprovação, homologação e (futuramente) comissionamento de demandas técnicas.

> **Escopo atual (Módulo 1 + 2):** fundação backend + autenticação + RBAC + gestão de usuários.  
> Cálculo de comissão/RV **não está implementado** — será o módulo final.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript 5 |
| ORM | Prisma 5 |
| Banco | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| UI | shadcn/ui + Tailwind CSS v3 |
| Validação | Zod + React Hook Form |
| Testes | Vitest |

---

## Estrutura de pastas

```
/
├── app/
│   ├── (auth)/login/               # Tela de login
│   ├── (dashboard)/                # Layout protegido
│   │   ├── dashboard/              # Visão geral
│   │   ├── usuarios/               # CRUD de usuários (ADMIN)
│   │   └── perfil/                 # Perfil do usuário logado
│   ├── acesso-bloqueado/           # Usuário inativo
│   └── api/
│       ├── auth/callback/          # Supabase OAuth callback
│       ├── users/                  # REST API de usuários
│       └── demands/                # REST API de demandas
├── components/
│   ├── auth/                       # LoginForm
│   ├── layout/                     # Sidebar, Header
│   ├── shared/                     # Badges reutilizáveis
│   ├── usuarios/                   # UserTable, UserForm
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── prisma.ts                   # Singleton do Prisma Client
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client (SSR)
│   │   └── admin.ts                # Admin client (service role)
│   └── utils.ts                    # cn() helper
├── middleware.ts                   # Proteção de rotas por auth + role
├── server/
│   ├── auth/
│   │   ├── permissions.ts          # Matriz de permissões pura
│   │   └── helpers.ts              # getCurrentUser, requireAuth, requireRole
│   └── actions/                    # Server Actions
├── services/                       # Lógica de negócio
├── repositories/                   # Acesso ao banco
├── validations/                    # Schemas Zod
├── types/                          # Tipos centrais
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── __tests__/
    └── permissions.test.ts         # 42 testes de permissão
```

---

## Instalação

### Pré-requisitos

- Node.js 20+
- Projeto no [Supabase](https://supabase.com) com **Auth habilitado**

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env` com suas credenciais do Supabase:

```env
# Pool de conexão (runtime)
DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexão direta (migrations)
DIRECT_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
```

---

## Configurar Supabase Auth

1. No Supabase Dashboard → **Authentication → Settings**
2. Confirme que **Email provider** está habilitado
3. Em **URL Configuration**, configure:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`
4. (Opcional) Desabilite "Confirm email" em ambiente de dev para o seed funcionar sem SMTP

---

## Migrations e banco

### Criar tabelas (primeira vez)

```bash
npm run db:migrate
# Nome sugerido: init
```

### Adicionar campo authUserId (se migrando do Módulo 1)

Se já existia um banco sem `authUserId`, rode:
```bash
npm run db:migrate
# Nome sugerido: add_auth_user_id
```

### Aplicar em produção

```bash
npm run db:migrate:deploy
```

---

## Login inicial

Após rodar o seed, acesse com:

| Campo | Valor |
|---|---|
| **E-mail** | `admin@gestor.local` |
| **Senha** | `Admin@123456` |
| **Role** | ADMIN |

> O ADMIN pode criar os demais usuários em **Usuários → Novo usuário** dentro do próprio sistema.

---

## Seed — usuário administrador inicial

O seed cria apenas o usuário ADMIN no Supabase Auth e na tabela `users`.
É **idempotente** — pode ser executado várias vezes sem duplicar dados.

```bash
npm run db:seed
```

**O que o seed faz:**

1. Verifica se `admin@gestor.local` já existe no Supabase Auth
   - Se sim → atualiza senha e metadata
   - Se não → cria o usuário com `email_confirm: true`
2. Faz `upsert` na tabela `users` com o `authUserId` correto
3. Exibe confirmação com o login para uso imediato

**Credenciais criadas pelo seed:**

| Nome | E-mail | Papel | Senha |
|---|---|---|---|
| Administrador | `admin@gestor.local` | ADMIN | `Admin@123456` |

> Os demais usuários devem ser cadastrados pelo próprio sistema após o primeiro login.

---

## Executar o projeto

```bash
npm run dev
# Acesse http://localhost:3000
```

O middleware redireciona automaticamente:
- `/` → `/dashboard` (autenticado) ou `/login` (não autenticado)
- `/login` → `/dashboard` se já autenticado

---

## Papéis de acesso (UserRole)

| Papel | Criar demanda | Editar demanda | Aprovar/homologar | Gerenciar usuários | Ver financeiro |
|---|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✓ | qualquer | ✓ | ✓ | ✓ |
| **GESTOR** | ✓ | próprias | ✓ aprovar | ✗ | ✓ |
| **DEV** | ✗ | atribuídas | ✗ | ✗ | ✗ |
| **APROVADOR** | ✗ | ✗ | ✓ homologar | ✗ | ✗ |
| **FINANCEIRO** | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## Perfis técnicos (WorkerProfile)

| Perfil | Obrigatório para |
|---|---|
| JUNIOR | DEV |
| SENIOR | DEV |
| ESPECIALISTA | DEV |

> ADMIN, GESTOR, APROVADOR e FINANCEIRO não precisam de `workerProfile`.

---

## Fluxo de status das demandas

```
RASCUNHO → ABERTA → EM_ANALISE → APROVADA → EM_DESENVOLVIMENTO
                                                      ↓
                                        AGUARDANDO_HOMOLOGACAO
                                                      ↓
                                         HOMOLOGADA_PRODUCAO → CONCLUIDA

Qualquer status → CANCELADA (apenas GESTOR/ADMIN)
EM_ANALISE | AGUARDANDO_HOMOLOGACAO → REPROVADA → EM_DESENVOLVIMENTO
```

**Regras especiais:**
- DEV não pode homologar sua própria entrega
- ADMIN não pode alterar o próprio papel
- Usuário inativo é redirecionado para `/acesso-bloqueado`

---

## Rotas da aplicação

| Rota | Acesso | Descrição |
|---|---|---|
| `/login` | Público | Tela de login |
| `/dashboard` | ADMIN, GESTOR, FINANCEIRO | Visão geral com métricas |
| `/demandas` | Todos | Lista de demandas (a implementar) |
| `/usuarios` | ADMIN | Gerenciamento de usuários |
| `/usuarios/novo` | ADMIN | Criar usuário |
| `/usuarios/:id` | ADMIN | Editar usuário |
| `/perfil` | Todos | Perfil do usuário logado |
| `/acesso-bloqueado` | Público | Conta desativada |

---

## API REST (Módulo 1 — ainda disponível)

| Método | Rota | Descrição |
|---|---|---|
| `GET/POST` | `/api/users` | Listar / criar usuário |
| `GET/PATCH/DELETE` | `/api/users/:id` | Buscar / atualizar / desativar |
| `GET/POST` | `/api/demands` | Listar / criar demanda |
| `GET/PATCH` | `/api/demands/:id` | Buscar / atualizar |
| `PATCH` | `/api/demands/:id/status` | Alterar status |
| `GET/POST` | `/api/demands/:id/evidences` | Evidências |
| `GET` | `/api/demands/:id/audit` | Audit log |

---

## Testes

```bash
npm test              # rodar todos
npm run test:ui       # interface visual
npm run test:coverage # cobertura
```

### Resultados atuais

```
✓ __tests__/permissions.test.ts (42 testes)
  ✓ canCreateUser (5)
  ✓ canEditUser (2)
  ✓ canDeactivateUser (3)
  ✓ canCreateDemand (5)
  ✓ canEditDemand (6)
  ✓ canChangeDemandStatus (7)
  ✓ canHomologateDemand (5)
  ✓ canViewFinancialData (5)
  ✓ canViewDashboard (4)
```

---

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` nunca é exposta ao browser
- Toda criação de usuário passa pelo `service role` server-side
- Middleware valida sessão em **todas** as rotas privadas
- Permissões verificadas **no backend** (services/permissionService) além do middleware
- Usuário inativo é bloqueado no middleware via metadata JWT (sem DB query)
- Role e `isActive` são sincronizados no Supabase Auth metadata a cada atualização

---

## Próximos módulos

| Módulo | Descrição |
|---|---|
| **Módulo 3** | Interface completa de demandas (listagem, criação, kanban de status) |
| **Módulo 4** | Fluxo de homologação (timeline, evidências, observações de aceite) |
| **Módulo 5** | Relatórios e métricas (SLA, volume por dev, tempo de entrega) |
| **Módulo 6** | Comissionamento/RV baseado nas demandas `HOMOLOGADA_PRODUCAO` |
