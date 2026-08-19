import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";
import path from "path";

const prisma = new PrismaClient();

interface SQLiteRow {
  [key: string]: any;
}

function getAllRows(dbPath: string, table: string): SQLiteRow[] {
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  db.close();
  return rows;
}

function mapBoolean(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  return Boolean(val);
}

function mapDateTime(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  return new Date(val);
}

async function migrate() {
  const dbPath = path.join(__dirname, "..", "prisma", "dev.db");
  console.log(`\n📦 Migration SQLite → PostgreSQL`);
  console.log(`   Source: ${dbPath}\n`);

  const tables = [
    "Entity",
    "User",
    "Bank",
    "BankEntity",
    "Template",
    "TemplateEntity",
    "TemplateField",
    "Beneficiary",
    "Cheque",
    "Effet",
    "AuditLog",
  ];

  for (const table of tables) {
    try {
      const rows = getAllRows(dbPath, table);
      console.log(`🔄 ${table}: ${rows.length} ligne(s) trouvée(s)`);

      if (rows.length === 0) {
        console.log(`   ⏭️  ignoré (vide)\n`);
        continue;
      }

      switch (table) {
        case "Entity":
          for (const r of rows) {
            await prisma.entity.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                name: r.name,
                code: r.code,
                dataMode: r.dataMode || "NORMAL",
                sapServerUrl: r.sapServerUrl || null,
                sapCompanyDB: r.sapCompanyDB || null,
                sapUser: r.sapUser || null,
                sapPassword: r.sapPassword || null,
                sapQuery: r.sapQuery || null,
                active: mapBoolean(r.active),
                createdAt: mapDateTime(r.createdAt) || new Date(),
                updatedAt: mapDateTime(r.updatedAt) || new Date(),
              },
            });
          }
          break;

        case "User":
          for (const r of rows) {
            await prisma.user.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                fullName: r.fullName,
                username: r.username,
                passwordHash: r.passwordHash,
                role: r.role || "COMPTABLE",
                entityId: r.entityId || null,
                active: mapBoolean(r.active),
                canEdit: mapBoolean(r.canEdit),
                createdAt: mapDateTime(r.createdAt) || new Date(),
                updatedAt: mapDateTime(r.updatedAt) || new Date(),
              },
            });
          }
          break;

        case "Bank":
          for (const r of rows) {
            await prisma.bank.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                name: r.name,
                code: r.code,
                logoUrl: r.logoUrl || null,
                active: mapBoolean(r.active),
                createdAt: mapDateTime(r.createdAt) || new Date(),
                updatedAt: mapDateTime(r.updatedAt) || new Date(),
              },
            });
          }
          break;

        case "BankEntity":
          for (const r of rows) {
            const exists = await prisma.bankEntity.findFirst({
              where: { bankId: r.bankId, entityId: r.entityId },
            });
            if (!exists) {
              await prisma.bankEntity.create({
                data: {
                  id: r.id,
                  bankId: r.bankId,
                  entityId: r.entityId,
                },
              });
            }
          }
          break;

        case "Template":
          for (const r of rows) {
            await prisma.template.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                bankId: r.bankId,
                documentType: r.documentType,
                name: r.name,
                backgroundImageUrl: r.backgroundImageUrl || null,
                physicalWidthMm: r.physicalWidthMm || 210,
                physicalHeightMm: r.physicalHeightMm || 100,
                isActive: mapBoolean(r.isActive),
                validFrom: mapDateTime(r.validFrom) || new Date(),
                validTo: mapDateTime(r.validTo) || null,
                createdAt: mapDateTime(r.createdAt) || new Date(),
              },
            });
          }
          break;

        case "TemplateEntity":
          for (const r of rows) {
            const exists = await prisma.templateEntity.findFirst({
              where: { templateId: r.templateId, entityId: r.entityId },
            });
            if (!exists) {
              await prisma.templateEntity.create({
                data: {
                  id: r.id,
                  templateId: r.templateId,
                  entityId: r.entityId,
                },
              });
            }
          }
          break;

        case "TemplateField":
          for (const r of rows) {
            await prisma.templateField.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                templateId: r.templateId,
                fieldKey: r.fieldKey,
                x: r.x,
                y: r.y,
                width: r.width,
                fontSize: r.fontSize || 10,
                fontFamily: r.fontFamily || "Helvetica",
                align: r.align || "LEFT",
                format: r.format || "TEXT",
              },
            });
          }
          break;

        case "Beneficiary":
          for (const r of rows) {
            const exists = await prisma.beneficiary.findFirst({
              where: { name: r.name, entityId: r.entityId || null },
            });
            if (!exists) {
              await prisma.beneficiary.create({
                data: {
                  id: r.id,
                  name: r.name,
                  code: r.code || null,
                  category: r.category || "FOURNISSEUR",
                  entityId: r.entityId || null,
                  active: mapBoolean(r.active),
                  createdAt: mapDateTime(r.createdAt) || new Date(),
                  updatedAt: mapDateTime(r.updatedAt) || new Date(),
                },
              });
            }
          }
          break;

        case "Cheque":
          for (const r of rows) {
            await prisma.cheque.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                bankId: r.bankId,
                templateId: r.templateId,
                entityId: r.entityId || null,
                beneficiary: r.beneficiary,
                amountNumeric: r.amountNumeric,
                amountWords: r.amountWords,
                creationDate: mapDateTime(r.creationDate) || new Date(),
                creationPlace: r.creationPlace || "Casablanca",
                status: r.status || "DRAFT",
                createdBy: r.createdBy || "",
                createdAt: mapDateTime(r.createdAt) || new Date(),
                printedAt: mapDateTime(r.printedAt) || null,
                deletedAt: mapDateTime(r.deletedAt) || null,
              },
            });
          }
          break;

        case "Effet":
          for (const r of rows) {
            await prisma.effet.upsert({
              where: { id: r.id },
              update: {},
              create: {
                id: r.id,
                bankId: r.bankId,
                templateId: r.templateId,
                entityId: r.entityId || null,
                sapCode: r.sapCode || "",
                beneficiary: r.beneficiary,
                dueDate: mapDateTime(r.dueDate) || new Date(),
                amountNumeric: r.amountNumeric,
                amountWords: r.amountWords,
                creationDate: mapDateTime(r.creationDate) || new Date(),
                creationPlace: r.creationPlace || "Casablanca",
                cause: r.cause || "",
                status: r.status || "DRAFT",
                createdBy: r.createdBy || "",
                createdAt: mapDateTime(r.createdAt) || new Date(),
                printedAt: mapDateTime(r.printedAt) || null,
                deletedAt: mapDateTime(r.deletedAt) || null,
              },
            });
          }
          break;

        case "AuditLog":
          for (const r of rows) {
            const exists = await prisma.auditLog.findFirst({
              where: { id: r.id },
            });
            if (!exists) {
              await prisma.auditLog.create({
                data: {
                  id: r.id,
                  userId: r.userId,
                  entityType: r.entityType,
                  entityId: r.entityId,
                  action: r.action,
                  oldValue: r.oldValue || null,
                  newValue: r.newValue || null,
                  createdAt: mapDateTime(r.createdAt) || new Date(),
                },
              });
            }
          }
          break;
      }

      console.log(`   ✅ ${table}: migré avec succès\n`);
    } catch (error: any) {
      console.error(`   ❌ ${table}: erreur - ${error.message}\n`);
    }
  }

  console.log(`\n🎉 Migration terminée !`);
  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
