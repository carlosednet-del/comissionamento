import {
  PrismaClient,
  UserRole,
  WorkerProfile,
  DemandType,
  DemandPriority,
  DemandStatus,
} from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function upsertAuthUser(
  admin: ReturnType<typeof supabaseAdmin>,
  email: string,
  password: string,
  metadata: { role: UserRole; isActive: boolean },
): Promise<string> {
  // Tenta buscar usuário existente pelo email
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { user_metadata: metadata });
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`Falha ao criar auth user ${email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  console.log("🌱 Iniciando seed...");

  const admin = supabaseAdmin();
  const defaultPassword = process.env.ADMIN_PASSWORD ?? "Seed@123456";

  // -------------------------------------------------------
  // Criar usuários no Supabase Auth e no banco
  // -------------------------------------------------------
  const usersToCreate = [
    { email: process.env.ADMIN_EMAIL ?? "admin@empresa.com", name: "Administrador", role: UserRole.ADMIN, workerProfile: null },
    { email: "gestor@empresa.com", name: "Carlos Gestor", role: UserRole.GESTOR, workerProfile: null },
    { email: "ana.junior@empresa.com", name: "Ana Júnior", role: UserRole.DEV, workerProfile: WorkerProfile.JUNIOR },
    { email: "bruno.senior@empresa.com", name: "Bruno Sênior", role: UserRole.DEV, workerProfile: WorkerProfile.SENIOR },
    { email: "diana.especialista@empresa.com", name: "Diana Especialista", role: UserRole.DEV, workerProfile: WorkerProfile.ESPECIALISTA },
    { email: "eduardo.aprovador@empresa.com", name: "Eduardo Aprovador", role: UserRole.APROVADOR, workerProfile: null },
    { email: "fernanda.financeiro@empresa.com", name: "Fernanda Financeiro", role: UserRole.FINANCEIRO, workerProfile: null },
  ];

  // Limpar audit logs e demandas antes de recriar users
  await prisma.auditLog.deleteMany();
  await prisma.demandEvidence.deleteMany();
  await prisma.demand.deleteMany();

  const createdUsers: Record<string, { id: string; dbId: string }> = {};

  for (const u of usersToCreate) {
    const authUserId = await upsertAuthUser(admin, u.email, defaultPassword, {
      role: u.role,
      isActive: true,
    });

    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: { authUserId, name: u.name, role: u.role, workerProfile: u.workerProfile },
      create: {
        authUserId,
        name: u.name,
        email: u.email,
        role: u.role,
        workerProfile: u.workerProfile,
        isActive: true,
      },
    });

    createdUsers[u.email] = { id: authUserId, dbId: dbUser.id };
    console.log(`  ✓ ${u.name} (${u.role})`);
  }

  console.log("✅ Usuários criados:", usersToCreate.length);

  const gestor = createdUsers["gestor@empresa.com"].dbId;
  const devSenior = createdUsers["bruno.senior@empresa.com"].dbId;
  const especialista = createdUsers["diana.especialista@empresa.com"].dbId;
  const adminDb = createdUsers[process.env.ADMIN_EMAIL ?? "admin@empresa.com"].dbId;
  const aprovador = createdUsers["eduardo.aprovador@empresa.com"].dbId;

  // -------------------------------------------------------
  // Demandas de exemplo
  // -------------------------------------------------------
  const demandRascunho = await prisma.demand.create({
    data: {
      title: "Novo relatório de vendas por região",
      description: "Criar dashboard com visualização de vendas segmentadas por região geográfica.",
      requesterArea: "Comercial", requesterName: "João Silva",
      demandType: DemandType.DASHBOARD, priority: DemandPriority.MEDIA,
      status: DemandStatus.RASCUNHO, systemAffected: "ERP", estimatedHours: 20,
      plannedDeliveryDate: new Date("2026-06-30"), creatorId: gestor,
    },
  });

  const demandAberta = await prisma.demand.create({
    data: {
      title: "Integração com API de pagamentos PagSeguro",
      description: "Implementar integração com API REST do PagSeguro para processamento de cobranças.",
      requesterArea: "Financeiro", requesterName: "Maria Santos",
      demandType: DemandType.INTEGRACAO, priority: DemandPriority.ALTA,
      status: DemandStatus.ABERTA, systemAffected: "Portal B2B", estimatedHours: 40,
      plannedDeliveryDate: new Date("2026-07-15"), creatorId: gestor, assigneeId: devSenior,
    },
  });

  const demandEmDev = await prisma.demand.create({
    data: {
      title: "Correção de bug no módulo de estoque",
      description: "Estoque não atualiza corretamente quando há transferência entre filiais no mesmo dia.",
      requesterArea: "Logística", requesterName: "Pedro Costa",
      demandType: DemandType.CORRECAO, priority: DemandPriority.CRITICA,
      status: DemandStatus.EM_DESENVOLVIMENTO, systemAffected: "WMS", estimatedHours: 8,
      plannedDeliveryDate: new Date("2026-06-05"), creatorId: gestor, assigneeId: especialista,
    },
  });

  const demandHomolog = await prisma.demand.create({
    data: {
      title: "Automação do processo de onboarding de clientes",
      description: "Automatizar envio de e-mails, criação de acessos e configuração inicial para novos clientes.",
      requesterArea: "Atendimento", requesterName: "Lúcia Ferreira",
      demandType: DemandType.AUTOMACAO, priority: DemandPriority.ALTA,
      status: DemandStatus.AGUARDANDO_HOMOLOGACAO, systemAffected: "CRM", estimatedHours: 60,
      plannedDeliveryDate: new Date("2026-05-20"), actualDeliveryDate: new Date("2026-05-22"),
      creatorId: gestor, assigneeId: devSenior,
    },
  });

  await prisma.demandEvidence.createMany({
    data: [
      { demandId: demandHomolog.id, title: "Vídeo demonstrativo", url: "https://drive.empresa.com/evidencias/onboarding-demo.mp4", description: "Gravação do fluxo completo" },
      { demandId: demandHomolog.id, title: "Screenshot testes", url: "https://drive.empresa.com/evidencias/onboarding-tests.png", description: "Resultado dos testes" },
    ],
  });

  const demandConcluida = await prisma.demand.create({
    data: {
      title: "Nova solução de geração de NF-e",
      description: "Desenvolver módulo nativo de emissão de Nota Fiscal Eletrônica substituindo solução legada.",
      requesterArea: "Fiscal", requesterName: "Roberto Alves",
      demandType: DemandType.NOVA_SOLUCAO, priority: DemandPriority.ALTA,
      status: DemandStatus.HOMOLOGADA_PRODUCAO, systemAffected: "ERP", estimatedHours: 120,
      plannedDeliveryDate: new Date("2026-04-30"), actualDeliveryDate: new Date("2026-04-28"),
      homologationDate: new Date("2026-05-05"), creatorId: adminDb, assigneeId: especialista,
    },
  });

  console.log("✅ Demandas criadas: 5");

  // -------------------------------------------------------
  // Audit logs
  // -------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      { entity: "Demand", entityId: demandRascunho.id, action: "CREATE", newValue: { status: "RASCUNHO" }, userId: gestor },
      { entity: "Demand", entityId: demandAberta.id, action: "CREATE", newValue: { status: "ABERTA" }, userId: gestor },
      { entity: "Demand", entityId: demandEmDev.id, action: "STATUS_CHANGE", oldValue: { status: "ABERTA" }, newValue: { status: "EM_DESENVOLVIMENTO" }, userId: gestor },
      { entity: "Demand", entityId: demandHomolog.id, action: "STATUS_CHANGE", oldValue: { status: "EM_DESENVOLVIMENTO" }, newValue: { status: "AGUARDANDO_HOMOLOGACAO" }, userId: devSenior },
      { entity: "Demand", entityId: demandConcluida.id, action: "HOMOLOGATION", oldValue: { status: "AGUARDANDO_HOMOLOGACAO" }, newValue: { status: "HOMOLOGADA_PRODUCAO" }, userId: aprovador },
    ],
  });

  console.log("✅ Audit logs criados: 5");
  console.log("\n🎉 Seed concluído!");
  console.log(`\n  📧 Admin: ${process.env.ADMIN_EMAIL ?? "admin@empresa.com"}`);
  console.log(`  🔑 Senha padrão: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
