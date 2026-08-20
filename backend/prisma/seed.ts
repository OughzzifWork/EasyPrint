import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generatePassword(length: number = 16): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

async function main() {
  console.log("Seeding database...");

  const adminPassword = "admin123";
  const comptablePassword = "comptable123";
  const visiteurPassword = "visiteur123";

  console.log("[SEED] Admin password (change in production):", adminPassword);
  console.log("[SEED] Comptable password (change in production):", comptablePassword);
  console.log("[SEED] Visiteur password (change in production):", visiteurPassword);

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const comptablePasswordHash = await bcrypt.hash(comptablePassword, 12);
  const visiteurPasswordHash = await bcrypt.hash(visiteurPassword, 12);

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
