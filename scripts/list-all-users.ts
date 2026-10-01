import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { name: true, role: true, isActive: true },
    orderBy: { name: "asc" },
  });
  for (const u of users) {
    console.log(`${u.role.padEnd(12)} ${u.isActive ? "✓" : "✗"} ${u.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
