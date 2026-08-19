import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, canEditOnly } from "../middleware/auth";
import { convertAmountToWordsFr } from "../lib/numberToWordsFr";
import { generateCalibratedPDF, FieldToPrint } from "../lib/pdfGenerator";
import { validate } from "../schemas/validate";
import { createChequeSchema, updateChequeSchema } from "../schemas/cheques";

const router = Router();

function isAdmin(req: any): boolean {
  return req.user!.role === "ADMIN";
}

function entityWhere(req: any): Record<string, string> {
  return isAdmin(req) ? {} : { entityId: req.user!.entityId };
}

router.get("/", authMiddleware, async (req, res) => {
  const bankId = req.query.bankId as string;
  const status = req.query.status as string;
  const search = req.query.search as string;
  const includeDeleted = req.query.includeDeleted === "true";

  const where: any = { ...entityWhere(req) };
  if (!includeDeleted) where.deletedAt = null;
  if (bankId) where.bankId = bankId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { beneficiary: { contains: search, mode: 'insensitive' } },
      { creationPlace: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const cheques = await prisma.cheque.findMany({
      where,
      include: { bank: true, template: true, entity: { select: { name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [...new Set(cheques.map((c) => c.createdBy).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, username: true } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName || u.username]));

    const result = cheques.map((c) => ({ ...c, createdByName: userMap.get(c.createdBy) || c.createdBy }));
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des chèques." });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const cheque = await prisma.cheque.findUnique({
      where: { id: req.params.id },
      include: { bank: true, template: { include: { fields: true } } },
    });
    if (!cheque) return res.status(404).json({ error: "Chèque non trouvé." });

    if (!isAdmin(req) && cheque.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    return res.json(cheque);
  } catch {
    return res.status(500).json({ error: "Erreur lors du chargement du chèque." });
  }
});

router.post("/", authMiddleware, canEditOnly, validate(createChequeSchema), async (req, res) => {
  try {
    const { bankId, templateId, beneficiary, amountNumeric, amountWords, creationDate, creationPlace } = req.body;

    let selectedTemplateId = templateId;
    if (!selectedTemplateId) {
      const templateWhere: any = { bankId, documentType: "CHEQUE", isActive: true };
      if (!isAdmin(req) && req.user!.entityId) {
        templateWhere.templateEntities = { some: { entityId: req.user!.entityId } };
      }
      const activeTemplate = await prisma.template.findFirst({
        where: templateWhere,
      });
      if (!activeTemplate) {
        return res.status(400).json({
          error: "Aucun modèle d'impression actif défini pour cette banque. Veuillez en créer un dans le Concepteur.",
        });
      }
      selectedTemplateId = activeTemplate.id;
    }

    const numAmount = parseFloat(amountNumeric);
    const finalAmountWords = amountWords || convertAmountToWordsFr(numAmount);
    const trimmedBeneficiary = beneficiary.trim();
    const entityId = req.user!.entityId;

    if (trimmedBeneficiary) {
      const existingB = await prisma.beneficiary.findFirst({
        where: { name: trimmedBeneficiary, ...(entityId ? { entityId } : {}) },
      });
      if (existingB) {
        await prisma.beneficiary.update({ where: { id: existingB.id }, data: { active: true } }).catch(() => {});
      } else {
        await prisma.beneficiary.create({
          data: { name: trimmedBeneficiary, category: "FOURNISSEUR", entityId },
        }).catch(() => {});
      }
    }

    const newCheque = await prisma.cheque.create({
      data: {
        bankId,
        templateId: selectedTemplateId,
        beneficiary: trimmedBeneficiary,
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : new Date(),
        creationPlace: creationPlace || "Casablanca",
        status: "DRAFT",
        createdBy: req.user!.fullName || req.user!.username,
        entityId,
      },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "CHEQUE",
        entityId: newCheque.id,
        action: "CREATE",
        newValue: JSON.stringify({ beneficiary: newCheque.beneficiary, amountNumeric: newCheque.amountNumeric }),
      },
    });

    return res.status(201).json(newCheque);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la création du chèque." });
  }
});

router.put("/:id", authMiddleware, canEditOnly, validate(updateChequeSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { beneficiary, amountNumeric, amountWords, creationDate, creationPlace, status, bankId, templateId } = req.body;

    const existingCheque = await prisma.cheque.findUnique({ where: { id } });
    if (!existingCheque) return res.status(404).json({ error: "Chèque non trouvé." });

    if (!isAdmin(req) && existingCheque.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const numAmount = amountNumeric !== undefined ? parseFloat(amountNumeric) : Number(existingCheque.amountNumeric);
    const finalAmountWords = amountWords || convertAmountToWordsFr(numAmount);

    const updatedCheque = await prisma.cheque.update({
      where: { id },
      data: {
        beneficiary: beneficiary !== undefined ? beneficiary.trim() : existingCheque.beneficiary,
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : existingCheque.creationDate,
        creationPlace: creationPlace !== undefined ? creationPlace : existingCheque.creationPlace,
        status: status !== undefined ? status : existingCheque.status,
        bankId: bankId !== undefined ? bankId : existingCheque.bankId,
        templateId: templateId !== undefined ? templateId : existingCheque.templateId,
      },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "CHEQUE",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ beneficiary: existingCheque.beneficiary, amountNumeric: existingCheque.amountNumeric }),
        newValue: JSON.stringify({ beneficiary: updatedCheque.beneficiary, amountNumeric: updatedCheque.amountNumeric }),
      },
    });

    return res.json(updatedCheque);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la modification du chèque." });
  }
});

router.delete("/:id", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const isHardDelete = req.query.hard === "true";
    const admin = isAdmin(req);

    const existingCheque = await prisma.cheque.findUnique({ where: { id } });
    if (!existingCheque) return res.status(404).json({ error: "Chèque non trouvé." });

    if (!admin && existingCheque.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    if (existingCheque.status === "PRINTED") {
      return res.status(400).json({ error: "Impossible de supprimer un chèque déjà imprimé." });
    }

    if (isHardDelete) {
      if (!admin) {
        return res.status(403).json({ error: "Seul un administrateur peut supprimer définitivement un chèque." });
      }

      await prisma.cheque.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          entityType: "CHEQUE",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(existingCheque),
        },
      });

      return res.json({ message: "Chèque supprimé définitivement." });
    }

    const softDeletedCheque = await prisma.cheque.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "CHEQUE",
        entityId: id,
        action: "SOFT_DELETE",
        oldValue: JSON.stringify({ deletedAt: null }),
        newValue: JSON.stringify({ deletedAt: softDeletedCheque.deletedAt }),
      },
    });

    return res.json({ message: "Chèque supprimé (Soft Delete) avec succès.", cheque: softDeletedCheque });
  } catch {
    return res.status(500).json({ error: "Erreur lors de la suppression du chèque." });
  }
});

router.post("/:id/restore", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existingCheque = await prisma.cheque.findUnique({ where: { id } });

    if (!existingCheque) {
      return res.status(404).json({ error: "Chèque non trouvé." });
    }

    if (!isAdmin(req) && existingCheque.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const restoredCheque = await prisma.cheque.update({
      where: { id },
      data: { deletedAt: null },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "CHEQUE",
        entityId: id,
        action: "RESTORE",
        oldValue: JSON.stringify({ deletedAt: existingCheque.deletedAt }),
        newValue: JSON.stringify({ deletedAt: null }),
      },
    });

    return res.json({ message: "Chèque restauré avec succès.", cheque: restoredCheque });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la restauration du chèque." });
  }
});

router.get("/:id/print", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const cheque = await prisma.cheque.findUnique({
      where: { id },
      include: { bank: true, template: { include: { fields: true } } },
    });

    if (!cheque) return res.status(404).json({ error: "Chèque non trouvé." });

    if (!isAdmin(req) && cheque.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    let template = cheque.template;
    if (!template) {
      template = (await prisma.template.findFirst({
        where: { bankId: cheque.bankId, documentType: "CHEQUE", isActive: true },
        include: { fields: true },
      })) as any;
    }

    if (!template || !template.fields || template.fields.length === 0) {
      return res.status(400).json({ error: "Aucun modèle d'impression actif configuré pour cette banque." });
    }

    const formattedDate = cheque.creationDate
      ? new Date(cheque.creationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const formattedAmount = `${Number(cheque.amountNumeric).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`;

    const dataMap: Record<string, string> = {
      beneficiary: cheque.beneficiary,
      amountNumeric: formattedAmount,
      amountWords: cheque.amountWords,
      creationDate: formattedDate,
      creationPlace: cheque.creationPlace || "",
    };

    const fieldsToPrint: FieldToPrint[] = template.fields.map((f: any) => ({
      fieldKey: f.fieldKey,
      value: dataMap[f.fieldKey] || "",
      x: f.x, y: f.y, width: f.width,
      fontSize: f.fontSize, fontFamily: f.fontFamily, align: f.align,
    }));

    const pdfBytes = await generateCalibratedPDF({
      physicalWidthMm: template.physicalWidthMm,
      physicalHeightMm: template.physicalHeightMm,
      backgroundImageUrl: template.backgroundImageUrl || null,
      fields: fieldsToPrint,
      drawGridOrBoxes: false,
    });

    await prisma.cheque.update({ where: { id }, data: { status: "PRINTED", printedAt: new Date() } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "CHEQUE",
        entityId: id,
        action: "PRINT",
        newValue: JSON.stringify({ printedAt: new Date(), templateId: template.id }),
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="cheque_${cheque.id}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("Error generating cheque print PDF:", error);
    return res.status(500).json({ error: "Erreur lors de la génération du PDF d'impression." });
  }
});

export default router;
