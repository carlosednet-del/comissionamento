/**
 * Seed — Carga inicial de usuários SOLICITANTE
 *
 * Cria (ou atualiza) os 38 usuários solicitantes com senha temporária.
 * É idempotente: pode ser executado múltiplas vezes sem duplicar registros.
 *
 * Execução:
 *   npx ts-node --project tsconfig.seed.json prisma/seed-solicitantes.ts
 *   (ou via script: npm run db:seed:solicitantes)
 *
 * ATENÇÃO — SENHA TEMPORÁRIA:
 *   Todos os usuários são criados com a senha "123Mudar".
 *   O campo forcePasswordChange não existe no schema atual.
 *   Os usuários devem ser orientados a trocar a senha no primeiro acesso.
 *   Ver README.md → seção "Usuários Solicitantes".
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "123Mudar";

// ── Lista de e-mails dos solicitantes ───────────────────────────────────────
const SOLICITANTE_EMAILS: string[] = [
  "alexandre.vicente@7lm.com.br",
  "apoioaproducao2@7lm.com.br",
  "arquitetura5@7lm.com.br",
  "bianca.tavares@7lm.com.br",
  "contabilidade@7lm.com.br",
  "dho@7lm.com.br",
  "dieb.simao@7lm.com.br",
  "diogo.carvalho@7lm.com.br",
  "djohanes@7lm.com.br",
  "engenharia@7lm.com.br",
  "fabio.rodrigues@7lm.com.br",
  "fabricio.freitas@7lm.com.br",
  "fernando.lima@novka.com.br",
  "fopag@7lm.com.br",
  "gestaocatalao@7lm.com.br",
  "gestaocredito@7lm.com.br",
  "gestaocx@7lm.com.br",
  "gestaofinanceiro@7lm.com.br",
  "gestaofinanceiro1@7lm.com.br",
  "gestaoprojetos@7lm.com.br",
  "gestaosuprimentos@7lm.com.br",
  "gestaotecnologia@7lm.com.br",
  "gestaovendasfsa@7lm.com.br",
  "gledson.leandro@7lm.com.br",
  "ivonete.carmo@7lm.com.br",
  "legalizacao2@7lm.com.br",
  "leticia.freitas@7lm.com.br",
  "luiz.bezerra@7lm.com.br",
  "maria.araujo@7lm.com.br",
  "marketing@7lm.com.br",
  "orony.rocha@7lm.com.br",
  "planejamentoecontrole@7lm.com.br",
  "planejamentofsa@7lm.com.br",
  "qsms@7lm.com.br",
  "rafael.lacerda@7lm.com.br",
  "supervisaocobranca@7lm.com.br",
  "suprimentos2@7lm.com.br",
  "victor.oliveira@7lm.com.br",
];

// Siglas conhecidas que devem ficar em maiúsculo
const KNOWN_ACRONYMS = new Set(["dho", "cx", "ti", "qsms", "rh", "dp", "cnh", "cnpj", "fsa"]);

/**
 * Gera um nome de exibição a partir do endereço de e-mail.
 * Exemplos:
 *   alexandre.vicente@7lm.com.br → "Alexandre Vicente"
 *   dho@7lm.com.br               → "DHO"
 *   contabilidade@7lm.com.br     → "Contabilidade"
 *   qsms@7lm.com.br              → "QSMS"
 *
 * Nomes gerados automaticamente podem não ser perfeitos — podem ser
 * editados manualmente na tela de usuários após a criação.
 */
function generateName(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(".")
    .map((part) => {
      if (KNOWN_ACRONYMS.has(part.toLowerCase())) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis de ambiente ausentes:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL\n" +
        "  SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Busca todos os usuários do Supabase Auth de forma paginada.
 * Retorna um Map<email, authUserId> para lookup rápido.
 */
async function loadAuthUserMap(): Promise<Map<string, string>> {
  const supabase = makeAdminClient();
  const emailToId = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Erro ao listar usuários no Supabase Auth: ${error.message}`);
    for (const u of data.users) {
      if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
    }
    if (data.users.length < perPage) break;
    page++;
  }

  return emailToId;
}

/**
 * Garante que o usuário existe no Supabase Auth.
 * - Se já existir: atualiza metadados e senha.
 * - Se não existir: cria com e-mail confirmado.
 * Retorna o authUserId.
 */
async function ensureAuthUser(
  email: string,
  authMap: Map<string, string>,
): Promise<string> {
  const supabase = makeAdminClient();
  const existingId = authMap.get(email.toLowerCase());

  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      email_confirm: true,
      user_metadata: { role: UserRole.SOLICITANTE, isActive: true },
    });
    if (error) throw new Error(`Erro ao atualizar ${email} no Auth: ${error.message}`);
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { role: UserRole.SOLICITANTE, isActive: true },
  });
  if (error) throw new Error(`Erro ao criar ${email} no Auth: ${error.message}`);
  authMap.set(email.toLowerCase(), data.user.id);
  return data.user.id;
}

async function main() {
  console.log("────────────────────────────────────────────────────────");
  console.log("  🌱  Seed Solicitantes — Gestor de Demandas Técnicas");
  console.log("────────────────────────────────────────────────────────\n");
  console.log(`  ${SOLICITANTE_EMAILS.length} usuários a processar...\n`);

  console.log("  [1/2] Carregando usuários existentes do Supabase Auth...");
  const authMap = await loadAuthUserMap();
  console.log(`        ${authMap.size} usuário(s) já no Auth.\n`);

  console.log("  [2/2] Sincronizando solicitantes...\n");

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const email of SOLICITANTE_EMAILS) {
    const name = generateName(email);
    try {
      const wasInAuth = authMap.has(email.toLowerCase());
      const authUserId = await ensureAuthUser(email, authMap);

      await prisma.user.upsert({
        where: { email },
        update: {
          authUserId,
          role: UserRole.SOLICITANTE,
          workerProfile: null,
          isActive: true,
        },
        create: {
          authUserId,
          name,
          email,
          role: UserRole.SOLICITANTE,
          workerProfile: null,
          isActive: true,
        },
      });

      if (wasInAuth) {
        console.log(`  ↺  ${email.padEnd(42)} → ${name}`);
        updated++;
      } else {
        console.log(`  ✓  ${email.padEnd(42)} → ${name}`);
        created++;
      }
    } catch (err) {
      console.error(`  ✗  ${email} — ${(err as Error).message}`);
      errors++;
    }
  }

  console.log(`
────────────────────────────────────────────────────────
  ✅  Seed concluído!

     Criados : ${created}
     Atualizados : ${updated}
     Erros : ${errors}

  ⚠️  SENHA TEMPORÁRIA: "123Mudar"
     O campo forcePasswordChange não existe no schema.
     Oriente os usuários a trocar a senha no primeiro acesso.
────────────────────────────────────────────────────────
`);

  if (errors > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("\n❌  Erro fatal no seed:", (e as Error).message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
