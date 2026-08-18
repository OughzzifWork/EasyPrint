const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const entities = await prisma.entity.findMany();
  console.log("Entities:", JSON.stringify(entities, null, 2));

  const banks = await prisma.bank.findMany();
  console.log("Banks:", JSON.stringify(banks, null, 2));

  // Create default entity if missing
  let entity = entities.find(e => e.code === "DEFAULT");
  if (!entity) {
    entity = await prisma.entity.create({
      data: { name: "Entité par défaut", code: "DEFAULT", dataMode: "NORMAL" },
    });
    console.log("Created DEFAULT entity:", entity.id);
  }

  // Assign all banks to default entity
  for (const bank of banks) {
    await prisma.bankEntity.upsert({
      where: { bankId_entityId: { bankId: bank.id, entityId: entity.id } },
      update: {},
      create: { bankId: bank.id, entityId: entity.id },
    });
  }
  console.log("Assigned", banks.length, "banks to DEFAULT entity");

  // Assign all templates to default entity
  const templates = await prisma.template.findMany();
  for (const template of templates) {
    await prisma.templateEntity.upsert({
      where: { templateId_entityId: { templateId: template.id, entityId: entity.id } },
      update: {},
      create: { templateId: template.id, entityId: entity.id },
    });
  }
  console.log("Assigned", templates.length, "templates to DEFAULT entity");
}

main().catch(console.error).finally(() => prisma.$disconnect());
