import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, canEditOnly } from "../middleware/auth";
import { generateCalibratedPDF, FieldToPrint } from "../lib/pdfGenerator";
import { validate } from "../schemas/validate";
import { createTemplateSchema, updateTemplateSchema, previewTemplateSchema } from "../schemas/templates";
import { isAdmin } from "../lib/utils";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const bankId = req.query.bankId as string;
  const documentType = req.query.documentType as string;

  const where: any = {};
  if (bankId) where.bankId = bankId;
  if (documentType) where.documentType = documentType;

  if (!isAdmin(req)) {
    if (!req.user!.entityId) {
      return res.json([]);
    }
    where.templateEntities = {
      some: { entityId: req.user!.entityId },
    };
  }

  try {
    const templates = await prisma.template.findMany({
      where,
      include: { bank: true, fields: true, templateEntities: { include: { entity: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(templates);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des modèles." });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: { bank: true, fields: true, templateEntities: { include: { entity: true } } },
    });

    if (!template) {
      return res.status(404).json({ error: "Modèle d'impression non trouvé." });
    }

    if (!isAdmin(req)) {
      const hasAccess = template.templateEntities.some((te) => te.entityId === req.user!.entityId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Accès refusé." });
      }
    }

    return res.json(template);
  } catch {
    return res.status(500).json({ error: "Erreur lors du chargement du modèle." });
  }
});

router.post("/", authMiddleware, canEditOnly, validate(createTemplateSchema), async (req, res) => {
  try {
    const {
      bankId, documentType, name, backgroundImageUrl,
      physicalWidthMm, physicalHeightMm, isActive, fields, entityIds,
    } = req.body;

    if (isActive) {
      await prisma.template.updateMany({
        where: { bankId, documentType, isActive: true },
        data: { isActive: false, validTo: new Date() },
      });
    }

    // Auto-assign to all entities that use this bank
    const bankEntities = await prisma.bankEntity.findMany({
      where: { bankId },
      select: { entityId: true },
    });
    const autoEntityIds = bankEntities.map((be) => be.entityId);
    const finalEntityIds = entityIds && entityIds.length > 0 ? entityIds : autoEntityIds;

    const newTemplate = await prisma.template.create({
      data: {
        bankId,
        documentType,
        name: name.trim(),
        backgroundImageUrl: backgroundImageUrl || null,
        physicalWidthMm: physicalWidthMm ? parseFloat(physicalWidthMm) : 210,
        physicalHeightMm: physicalHeightMm ? parseFloat(physicalHeightMm) : 100,
        isActive: isActive !== undefined ? isActive : true,
        templateEntities: {
          create: finalEntityIds.map((entityId: string) => ({ entityId })),
        },
        fields: {
          create: (fields || []).map((f: any) => ({
            fieldKey: f.fieldKey,
            x: parseFloat(f.x),
            y: parseFloat(f.y),
            width: parseFloat(f.width),
            fontSize: f.fontSize ? parseFloat(f.fontSize) : 10,
            fontFamily: f.fontFamily || "Helvetica",
            align: f.align || "LEFT",
            format: f.format || "TEXT",
          })),
        },
      },
      include: { fields: true, bank: true, templateEntities: { include: { entity: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "TEMPLATE",
        entityId: newTemplate.id,
        action: "CREATE",
        newValue: JSON.stringify({ name: newTemplate.name, bankId, documentType, fieldCount: newTemplate.fields.length }),
      },
    });

    return res.status(201).json(newTemplate);
  } catch (error: any) {
    console.error("[Templates Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la création du modèle." });
  }
});

router.put("/:id", authMiddleware, canEditOnly, validate(updateTemplateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, backgroundImageUrl, physicalWidthMm, physicalHeightMm, isActive, fields, entityIds } = req.body;

    const existingTemplate = await prisma.template.findUnique({
      where: { id },
      include: { templateEntities: true },
    });
    if (!existingTemplate) {
      return res.status(404).json({ error: "Modèle d'impression non trouvé." });
    }

    if (!isAdmin(req)) {
      const hasAccess = existingTemplate.templateEntities.some((te) => te.entityId === req.user!.entityId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Accès refusé." });
      }
    }

    if (isActive && !existingTemplate.isActive) {
      await prisma.template.updateMany({
        where: { bankId: existingTemplate.bankId, documentType: existingTemplate.documentType, isActive: true },
        data: { isActive: false, validTo: new Date() },
      });
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (entityIds !== undefined) {
        await tx.templateEntity.deleteMany({ where: { templateId: id } });
        if (entityIds.length > 0) {
          await tx.templateEntity.createMany({
            data: entityIds.map((entityId: string) => ({ templateId: id, entityId })),
          });
        }
      } else {
        // Auto-sync: ensure all entities using this bank have the template
        const bankEntities = await tx.bankEntity.findMany({
          where: { bankId: existingTemplate.bankId },
          select: { entityId: true },
        });
        const autoIds = bankEntities.map((be) => be.entityId);
        const currentIds = existingTemplate.templateEntities.map((te) => te.entityId);
        const missingIds = autoIds.filter((eid) => !currentIds.includes(eid));
        if (missingIds.length > 0) {
          await tx.templateEntity.createMany({
            data: missingIds.map((entityId) => ({ templateId: id, entityId })),
          });
        }
      }

      if (fields) {
        await tx.templateField.deleteMany({ where: { templateId: id } });
      }

      return tx.template.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingTemplate.name,
          backgroundImageUrl: backgroundImageUrl !== undefined ? backgroundImageUrl : existingTemplate.backgroundImageUrl,
          physicalWidthMm: physicalWidthMm ? parseFloat(physicalWidthMm) : existingTemplate.physicalWidthMm,
          physicalHeightMm: physicalHeightMm ? parseFloat(physicalHeightMm) : existingTemplate.physicalHeightMm,
          isActive: isActive !== undefined ? isActive : existingTemplate.isActive,
          fields: fields
            ? {
                create: fields.map((f: any) => ({
                  fieldKey: f.fieldKey,
                  x: parseFloat(f.x),
                  y: parseFloat(f.y),
                  width: parseFloat(f.width),
                  fontSize: f.fontSize ? parseFloat(f.fontSize) : 10,
                  fontFamily: f.fontFamily || "Helvetica",
                  align: f.align || "LEFT",
                  format: f.format || "TEXT",
                })),
              }
            : undefined,
        },
        include: { fields: true, bank: true, templateEntities: { include: { entity: true } } },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "TEMPLATE",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ name: existingTemplate.name, isActive: existingTemplate.isActive }),
        newValue: JSON.stringify({ name: updatedTemplate.name, isActive: updatedTemplate.isActive }),
      },
    });

    return res.json(updatedTemplate);
  } catch (error: any) {
    console.error("[Templates Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la mise à jour du modèle." });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Accès refusé. Rôle Administrateur requis." });
  }

  try {
    const { id } = req.params;
    const existingTemplate = await prisma.template.findUnique({ where: { id } });

    if (!existingTemplate) {
      return res.status(404).json({ error: "Modèle non trouvé." });
    }

    await prisma.$transaction(async (tx) => {
      const fallbackTemplate = await tx.template.findFirst({
        where: { bankId: existingTemplate.bankId, documentType: existingTemplate.documentType, id: { not: id } },
      });

      if (fallbackTemplate) {
        if (existingTemplate.documentType === "CHEQUE") {
          await tx.cheque.updateMany({ where: { templateId: id }, data: { templateId: fallbackTemplate.id } });
        } else {
          await tx.effet.updateMany({ where: { templateId: id }, data: { templateId: fallbackTemplate.id } });
        }
      }

      await tx.templateField.deleteMany({ where: { templateId: id } });
      await tx.templateEntity.deleteMany({ where: { templateId: id } });
      await tx.template.delete({ where: { id } });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "TEMPLATE",
        entityId: id,
        action: "DELETE",
        oldValue: JSON.stringify(existingTemplate),
      },
    });

    return res.json({ message: "Modèle supprimé avec succès." });
  } catch (error: any) {
    console.error("[Templates Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la suppression du modèle." });
  }
});

router.post("/preview", authMiddleware, validate(previewTemplateSchema), async (req, res) => {
  try {
    const {
      physicalWidthMm, physicalHeightMm, backgroundImageUrl,
      fields, drawGridOrBoxes = true, sampleData = {},
    } = req.body;

    const widthMm = physicalWidthMm ? parseFloat(physicalWidthMm) : 210;
    const heightMm = physicalHeightMm ? parseFloat(physicalHeightMm) : 100;

    const fieldsToPrint: FieldToPrint[] = (fields || []).map((f: any) => {
      let sampleVal = sampleData[f.fieldKey];
      if (!sampleVal) {
        const defaults: Record<string, string> = {
          beneficiary: "SOCIETE INDUSTRIELLE & COMMERCIALE S.A.",
          amountNumeric: "125 450,00 #",
          amountWords: "Cent vingt-cinq mille quatre cent cinquante Dirhams et 00 Centimes",
          creationDate: "30/07/2026",
          creationPlace: "Casablanca",
          dueDate: "30/09/2026",
          cause: "Règlement Facture N° FAC-2026-0891",
          sapCode: "SAP-901847",
        };
        sampleVal = defaults[f.fieldKey] || `[${f.fieldKey}]`;
      }

      return {
        fieldKey: f.fieldKey,
        value: String(sampleVal),
        x: parseFloat(f.x),
        y: parseFloat(f.y),
        width: parseFloat(f.width),
        fontSize: f.fontSize ? parseFloat(f.fontSize) : 10,
        fontFamily: f.fontFamily || "Helvetica",
        align: f.align || "LEFT",
      };
    });

    const pdfBytes = await generateCalibratedPDF({
      physicalWidthMm: widthMm,
      physicalHeightMm: heightMm,
      backgroundImageUrl: backgroundImageUrl || null,
      fields: fieldsToPrint,
      drawGridOrBoxes: drawGridOrBoxes !== undefined ? drawGridOrBoxes : true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="apercu_modele_impce.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("PDF Preview generation error:", error);
    return res.status(500).json({ error: "Erreur lors de la génération du PDF d'aperçu." });
  }
});

export default router;
