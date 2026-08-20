import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";
import { encrypt, decrypt, maskPassword } from "../lib/crypto";
import { validate } from "../schemas/validate";
import { createEntitySchema, updateEntitySchema } from "../schemas/entities";
import { testConnection, executeQuery, executeParameterizedQuery, sql } from "../lib/sapHana";
import { convertAmountToWordsFr } from "../lib/numberToWordsFr";

const router = Router();

router.use(authMiddleware);

// List all entities (admin only)
router.get("/", adminOnly, async (_req, res) => {
  try {
    const entities = await prisma.entity.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, bankEntities: true, cheques: true, effets: true } } },
    });
    return res.json(entities.map(e => ({ ...e, sapPassword: e.sapPassword ? maskPassword() : null })));
  } catch (error: any) {
    console.error("[Entities Error]", error.message);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get single entity
router.get("/:id", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true, bankEntities: true, cheques: true, effets: true, beneficiaries: true } } },
    });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });
    return res.json({ ...entity, sapPassword: entity.sapPassword ? maskPassword() : null });
  } catch (error: any) {
    console.error("[Entities Error]", error.message);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Create entity
router.post("/", adminOnly, validate(createEntitySchema), async (req, res) => {
  try {
    const { name, code, dataMode, defaultCreationPlace, sapServerUrl, sapCompanyDB, sapUser, sapPassword, sapQuery } = req.body;

    const existing = await prisma.entity.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ error: "Ce code entité existe déjà." });

    const entity = await prisma.entity.create({
      data: {
        name, code: code.toUpperCase(), dataMode: dataMode || "NORMAL",
        defaultCreationPlace: defaultCreationPlace || "Casablanca",
        sapServerUrl, sapCompanyDB, sapUser,
        sapPassword: sapPassword ? encrypt(sapPassword) : null,
        sapQuery,
      },
    });
    return res.status(201).json({ ...entity, sapPassword: entity.sapPassword ? maskPassword() : null });
  } catch (error: any) {
    console.error("[Entities Error]", error.message);
    return res.status(500).json({ error: "Erreur serveur lors de la création de l'entité." });
  }
});

// Update entity
router.put("/:id", adminOnly, validate(updateEntitySchema), async (req, res) => {
  try {
    const { name, code, dataMode, defaultCreationPlace, sapServerUrl, sapCompanyDB, sapUser, sapPassword, sapQuery, active } = req.body;
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });

    if (code && code !== entity.code) {
      const existing = await prisma.entity.findUnique({ where: { code } });
      if (existing) return res.status(400).json({ error: "Ce code entité existe déjà." });
    }

    const updated = await prisma.entity.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(dataMode && { dataMode }),
        ...(defaultCreationPlace !== undefined && { defaultCreationPlace }),
        ...(sapServerUrl !== undefined && { sapServerUrl }),
        ...(sapCompanyDB !== undefined && { sapCompanyDB }),
        ...(sapUser !== undefined && { sapUser }),
        ...(sapPassword !== undefined && {
          sapPassword: sapPassword === "••••••••" || sapPassword === maskPassword()
            ? entity.sapPassword
            : sapPassword === ""
              ? null
              : encrypt(sapPassword),
        }),
        ...(sapQuery !== undefined && { sapQuery }),
        ...(active !== undefined && { active }),
      },
    });
    return res.json({ ...updated, sapPassword: updated.sapPassword ? maskPassword() : null });
  } catch (error: any) {
    console.error("[Entities Error]", error.message);
    return res.status(500).json({ error: "Erreur serveur lors de la mise à jour de l'entité." });
  }
});

// Delete entity
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });

    // Check if entity has users or data
    const counts = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true, cheques: true, effets: true } } },
    });
    if (counts && (counts._count.users > 0 || counts._count.cheques > 0 || counts._count.effets > 0)) {
      return res.status(400).json({ error: `Impossible de supprimer: ${counts._count.users} utilisateur(s), ${counts._count.cheques} chèque(s), ${counts._count.effets} effet(s) associés.` });
    }

    // Delete join table records first
    await prisma.bankEntity.deleteMany({ where: { entityId: req.params.id } });
    await prisma.templateEntity.deleteMany({ where: { entityId: req.params.id } });
    await prisma.beneficiary.deleteMany({ where: { entityId: req.params.id } });
    await prisma.entity.delete({ where: { id: req.params.id } });

    return res.json({ message: "Entité supprimée définitivement." });
  } catch (error: any) {
    console.error("[Entities Error]", error.message);
    return res.status(500).json({ error: "Erreur serveur lors de la suppression de l'entité." });
  }
});

// Test SAP connection
router.post("/:id/test-sap", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });
    if (!entity.sapServerUrl || !entity.sapCompanyDB || !entity.sapUser || !entity.sapPassword) {
      return res.status(400).json({ error: "Configuration SAP incomplète." });
    }

    const sapPasswordPlain = decrypt(entity.sapPassword);
    const result = await testConnection({
      serverUrl: entity.sapServerUrl,
      companyDB: entity.sapCompanyDB,
      user: entity.sapUser,
      password: sapPasswordPlain,
    });

    res.setHeader("Content-Type", "application/json");
    if (result.success) {
      return res.status(200).send(JSON.stringify(result));
    }
    return res.status(400).send(JSON.stringify({ error: result.message }));
  } catch (error: any) {
    console.error("[SAP Test Error]", error.message);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).send(JSON.stringify({ error: "Erreur lors du test de connexion SAP." }));
  }
});

// Lookup single document from SAP B1 by code
router.get("/:id/sap-lookup/:code", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });
    if (entity.dataMode !== "SAP") return res.status(400).json({ error: "Cette entité n'est pas en mode SAP." });
    if (!entity.sapServerUrl || !entity.sapCompanyDB || !entity.sapUser || !entity.sapPassword) {
      return res.status(400).json({ error: "Configuration SAP incomplète." });
    }

    const code = req.params.code.trim();
    if (!code) return res.status(400).json({ error: "Code SAP requis." });

    const sapPasswordPlain = decrypt(entity.sapPassword);
    const lookupQuery = `SELECT * FROM (${entity.sapQuery}) AS _q WHERE sapCode LIKE @code ORDER BY dueDate DESC`;

    const rows = await executeParameterizedQuery(
      { serverUrl: entity.sapServerUrl, companyDB: entity.sapCompanyDB, user: entity.sapUser, password: sapPasswordPlain },
      lookupQuery,
      [{ name: "code", type: sql.NVarChar, value: code + "%" }]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: `Aucun document SAP trouvé pour le code "${code}".` });
    }
    return res.json(rows[0]);
  } catch (error: any) {
    console.error("[SAP Lookup Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la recherche SAP." });
  }
});

// Pull data from SAP
router.post("/:id/pull-sap", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });

    const { documentType, bankId, templateId, createdBy } = req.body;
    if (!documentType || !["CHEQUE", "EFFET"].includes(documentType)) {
      return res.status(400).json({ error: "documentType requis: CHEQUE ou EFFET." });
    }
    if (!bankId) {
      return res.status(400).json({ error: "bankId requis." });
    }

    if (entity.dataMode !== "SAP") return res.status(400).json({ error: "Cette entité n'est pas en mode SAP." });
    if (!entity.sapQuery) return res.status(400).json({ error: "Aucune requête SQL configurée." });
    if (!entity.sapServerUrl || !entity.sapCompanyDB || !entity.sapUser || !entity.sapPassword) {
      return res.status(400).json({ error: "Configuration SAP incomplète." });
    }

    const bank = await prisma.bank.findUnique({ where: { id: bankId } });
    if (!bank) return res.status(404).json({ error: "Banque non trouvée." });

    let selectedTemplateId = templateId;
    if (!selectedTemplateId) {
      const activeTemplate = await prisma.template.findFirst({
        where: { bankId, documentType, isActive: true },
      });
      if (!activeTemplate) {
        return res.status(400).json({ error: `Aucun modèle actif pour ${documentType} avec cette banque.` });
      }
      selectedTemplateId = activeTemplate.id;
    }

    const sapPasswordPlain = decrypt(entity.sapPassword);
    const sapParams = {
      serverUrl: entity.sapServerUrl,
      companyDB: entity.sapCompanyDB,
      user: entity.sapUser,
      password: sapPasswordPlain,
    };

    const rows = await executeQuery(sapParams, entity.sapQuery);

    if (!rows || rows.length === 0) {
      return res.json({ success: true, message: "La requête n'a retourné aucun résultat.", count: 0, imported: [] });
    }

    const mappingUser = createdBy || req.user!.id;
    const imported: any[] = [];

    if (documentType === "CHEQUE") {
      for (const row of rows) {
        const beneficiary = String(row.beneficiary || row.Beneficiary || row.CardName || row.CARDNAME || "").trim();
        const rawAmount = parseFloat(row.amountNumeric || row.AmountNumeric || row.DocTotal || row.DOCTOTAL || 0);
        const amountWords = row.amountWords || row.AmountWords
          ? String(row.amountWords || row.AmountWords)
          : convertAmountToWordsFr(rawAmount);
        const creationDate = row.creationDate || row.CreationDate || row.DocDate || row.DOCDATE
          ? new Date(row.creationDate || row.CreationDate || row.DocDate || row.DOCDATE)
          : new Date();
        const creationPlace = String(row.creationPlace || row.CreationPlace || row.City || row.CITY || "").trim();

        if (!beneficiary || !rawAmount) continue;

        const cheque = await prisma.cheque.create({
          data: {
            bankId,
            templateId: selectedTemplateId,
            entityId: entity.id,
            beneficiary,
            amountNumeric: rawAmount,
            amountWords,
            creationDate,
            creationPlace: creationPlace || "Casablanca",
            status: "DRAFT",
            createdBy: mappingUser,
          },
        });
        imported.push(cheque);
      }
    } else {
      for (const row of rows) {
        const beneficiary = String(row.beneficiary || row.Beneficiary || row.CardName || row.CARDNAME || "").trim();
        const sapCode = String(row.sapCode || row.SapCode || row.CardCode || row.CARDCODE || "").trim();
        const rawAmount = parseFloat(row.amountNumeric || row.AmountNumeric || row.DocTotal || row.DOCTOTAL || 0);
        const amountWords = row.amountWords || row.AmountWords
          ? String(row.amountWords || row.AmountWords)
          : convertAmountToWordsFr(rawAmount);
        const creationDate = row.creationDate || row.CreationDate || row.DocDate || row.DOCDATE
          ? new Date(row.creationDate || row.CreationDate || row.DocDate || row.DOCDATE)
          : new Date();
        const creationPlace = String(row.creationPlace || row.CreationPlace || row.City || row.CITY || "").trim();
        const dueDate = row.dueDate || row.DueDate || row.TaxDate || row.TAXDATE
          ? new Date(row.dueDate || row.DueDate || row.TaxDate || row.TAXDATE)
          : new Date();
        const cause = String(row.cause || row.Cause || row.Comments || row.COMMENTS || "").trim();

        if (!beneficiary || !rawAmount || !sapCode) continue;

        const effet = await prisma.effet.create({
          data: {
            bankId,
            templateId: selectedTemplateId,
            entityId: entity.id,
            sapCode,
            beneficiary,
            dueDate,
            amountNumeric: rawAmount,
            amountWords,
            creationDate,
            creationPlace: creationPlace || "Casablanca",
            cause: cause || "Impayé",
            status: "DRAFT",
            createdBy: mappingUser,
          },
        });
        imported.push(effet);
      }
    }

    return res.json({
      success: true,
      message: `${imported.length} document(s) ${documentType} importé(s) avec succès.`,
      count: imported.length,
      total: rows.length,
      imported,
    });
  } catch (error: any) {
    console.error("[SAP Pull Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de l'import SAP." });
  }
});

export default router;
