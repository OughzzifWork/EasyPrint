import { PrismaClient } from "@prisma/client";
import { encrypt, isEncrypted } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting SAP password encryption migration...");

  const entities = await prisma.entity.findMany({
    where: { sapPassword: { not: null } },
    select: { id: true, code: true, sapPassword: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const entity of entities) {
    if (!entity.sapPassword) {
      skipped++;
      continue;
    }

    if (isEncrypted(entity.sapPassword)) {
      skipped++;
      continue;
    }

    const encrypted = encrypt(entity.sapPassword);
    await prisma.entity.update({
      where: { id: entity.id },
      data: { sapPassword: encrypted },
    });

    migrated++;
    console.log(`  Encrypted SAP password for entity: ${entity.code} (${entity.id})`);
  }

  console.log(`Migration complete. ${migrated} encrypted, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
