import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const comptablePasswordHash = await bcrypt.hash("comptable123", 10);
  const visiteurPasswordHash = await bcrypt.hash("visiteur123", 10);

  // Create Users
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Administrateur Système",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      active: true,
      canEdit: true,
    },
  });

  const comptableUser = await prisma.user.upsert({
    where: { username: "comptable" },
    update: {},
    create: {
      username: "comptable",
      fullName: "Jean Dupont (Comptable)",
      passwordHash: comptablePasswordHash,
      role: "COMPTABLE",
      active: true,
      canEdit: true,
    },
  });

  const visiteurUser = await prisma.user.upsert({
    where: { username: "visiteur" },
    update: {},
    create: {
      username: "visiteur",
      fullName: "Marie Martin (Auditeur/Visiteur)",
      passwordHash: visiteurPasswordHash,
      role: "VISITEUR",
      active: true,
      canEdit: false,
    },
  });

  console.log("Created users:", adminUser.username, comptableUser.username, visiteurUser.username);

  // Create Sample Banks
  const bank1 = await prisma.bank.upsert({
    where: { code: "ATTIJARI" },
    update: {},
    create: {
      code: "ATTIJARI",
      name: "Attijariwafa Bank",
      active: true,
    },
  });

  const bank2 = await prisma.bank.upsert({
    where: { code: "BP" },
    update: {},
    create: {
      code: "BP",
      name: "Banque Populaire",
      active: true,
    },
  });

  const bank3 = await prisma.bank.upsert({
    where: { code: "BMCE" },
    update: {},
    create: {
      code: "BMCE",
      name: "BANK OF AFRICA (BMCE)",
      active: true,
    },
  });

  console.log("Created banks:", bank1.code, bank2.code, bank3.code);
  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
