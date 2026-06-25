/**
 * Seed — Gestor de Demandas Técnicas
 *
 * Cria (ou atualiza) apenas o usuário administrador inicial.
 * É idempotente: pode ser executado várias vezes sem duplicar dados.
 *
 * Execução:
 *   npm run db:seed
 *   npx prisma db seed
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// ── Credenciais do admin inicial ────────────────────────────────
const ADMIN_EMAIL = "admin@gestor.local";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_NAME = "Administrador";

const DIRETOR_EMAIL = "diretor@gestor.local";
const DIRETOR_PASSWORD = "Diretor@123456";
const DIRETOR_NAME = "Diretor";
// ────────────────────────────────────────────────────────────────

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis ausentes no .env:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL\n" +
        "  SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Retorna o ID do usuário no Supabase Auth.
 *
 * - Se o e-mail já existir → atualiza senha + metadata e retorna o ID existente.
 * - Se não existir → cria o usuário e retorna o novo ID.
 */
async function resolveAuthUserId(): Promise<string> {
  const supabase = makeAdminClient();

  // Buscar por e-mail nas primeiras 1000 entradas (suficiente para projetos internos)
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Erro ao listar usuários no Supabase Auth: ${listError.message}`);
  }

  const existing = list?.users?.find((u) => u.email === ADMIN_EMAIL);

  if (existing) {
    console.log(`  ↺  Supabase Auth: usuário já existe  →  ${existing.id}`);

    // Garante que a senha e os metadados estão corretos
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: UserRole.ADMIN, isActive: true },
    });

    if (updateError) {
      throw new Error(`Erro ao atualizar usuário no Auth: ${updateError.message}`);
    }

    return existing.id;
  }

  // Criar novo usuário no Supabase Auth
  const { data, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { role: UserRole.ADMIN, isActive: true },
  });

  if (createError) {
    throw new Error(`Erro ao criar usuário no Auth: ${createError.message}`);
  }

  console.log(`  ✓  Supabase Auth: usuário criado    →  ${data.user.id}`);
  return data.user.id;
}

async function resolveAuthUserIdFor(email: string, password: string, role: UserRole): Promise<string> {
  const supabase = makeAdminClient();
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`Erro ao listar usuários no Supabase Auth: ${listError.message}`);

  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { role, isActive: true },
    });
    console.log(`  ↺  Supabase Auth: ${email} já existe  →  ${existing.id}`);
    return existing.id;
  }

  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, isActive: true },
  });
  if (createError) throw new Error(`Erro ao criar usuário no Auth: ${createError.message}`);
  console.log(`  ✓  Supabase Auth: ${email} criado  →  ${data.user.id}`);
  return data.user.id;
}

async function main() {
  console.log("────────────────────────────────────────────────");
  console.log("  🌱  Seed — Gestor de Demandas Técnicas");
  console.log("────────────────────────────────────────────────\n");

  // ── Admin ──────────────────────────────────────────────────
  console.log("  [1/4] Supabase Auth — admin...");
  const authUserId = await resolveAuthUserId();

  console.log("\n  [2/4] Banco de dados — admin...");
  const dbUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      authUserId,
      name: ADMIN_NAME,
      role: UserRole.ADMIN,
      workerProfile: null,
      isActive: true,
    },
    create: {
      authUserId,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: UserRole.ADMIN,
      workerProfile: null,
      isActive: true,
    },
  });
  console.log(`  ✓  DB id (admin)    →  ${dbUser.id}`);

  // ── Diretor ────────────────────────────────────────────────
  console.log("\n  [3/4] Supabase Auth — diretor...");
  const diretorAuthId = await resolveAuthUserIdFor(DIRETOR_EMAIL, DIRETOR_PASSWORD, UserRole.DIRETOR);

  console.log("\n  [4/4] Banco de dados — diretor...");
  const diretorUser = await prisma.user.upsert({
    where: { email: DIRETOR_EMAIL },
    update: {
      authUserId: diretorAuthId,
      name: DIRETOR_NAME,
      role: UserRole.DIRETOR,
      workerProfile: null,
      isActive: true,
    },
    create: {
      authUserId: diretorAuthId,
      name: DIRETOR_NAME,
      email: DIRETOR_EMAIL,
      role: UserRole.DIRETOR,
      workerProfile: null,
      isActive: true,
    },
  });
  console.log(`  ✓  DB id (diretor)  →  ${diretorUser.id}`);

  console.log(`
────────────────────────────────────────────────
  ✅  Seed concluído com sucesso!

     Logins do sistema
     ┌──────────────────────────────────────────┐
     │  E-mail : ${ADMIN_EMAIL.padEnd(29)} │
     │  Senha  : ${ADMIN_PASSWORD.padEnd(29)} │
     │  Role   : ADMIN                          │
     ├──────────────────────────────────────────┤
     │  E-mail : ${DIRETOR_EMAIL.padEnd(29)} │
     │  Senha  : ${DIRETOR_PASSWORD.padEnd(29)} │
     │  Role   : DIRETOR                        │
     └──────────────────────────────────────────┘

  Acesse http://localhost:3000/login
────────────────────────────────────────────────
`);
}

main()
  .catch((e) => {
    console.error("\n❌  Erro no seed:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
