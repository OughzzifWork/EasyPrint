import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, canEditOnly } from "../middleware/auth";
import { convertAmountToWordsFr } from "../lib/numberToWordsFr";
import { generateCalibratedPDF, FieldToPrint } from "../lib/pdfGenerator";

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
      { beneficiary: { contains: search } },
      { sapCode: { contains: search } },
      { cause: { contains: search } },
    ];
  }

  try {
    const effets = await prisma.effet.findMany({
      where,
      include: { bank: true, template: true, entity: { select: { name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [...new Set(effets.map((e) => e.createdBy).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, username: true } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName || u.username]));

    const result = effets.map((e) => ({ ...e, createdByName: userMap.get(e.createdBy) || e.createdBy }));
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des effets." });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const effet = await prisma.effet.findUnique({
      where: { id: req.params.id },
      include: { bank: true, template: { include: { fields: true } } },
    });
    if (!effet) return res.status(404).json({ error: "Effet non trouvé." });

    if (!isAdmin(req) && effet.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    return res.json(effet);
  } catch {
    return res.status(500).json({ error: "Erreur lors du chargement de l'effet." });
  }
});

router.post("/", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { bankId, templateId, sapCode, beneficiary, dueDate, amountNumeric, amountWords, creationDate, creationPlace, cause } = req.body;

    if (!bankId || !beneficiary || !amountNumeric || !dueDate) {
      return res.status(400).json({ error: "La banque, le bénéficiaire, la date d'échéance et le montant sont obligatoires." });
    }

    let selectedTemplateId = templateId;
    if (!selectedTemplateId) {
      const templateWhere: any = { bankId, documentType: "EFFET", isActive: true };
      if (!isAdmin(req) && req.user!.entityId) {
        templateWhere.templateEntities = { some: { entityId: req.user!.entityId } };
      }
      const activeTemplate = await prisma.template.findFirst({
        where: templateWhere,
      });
      if (!activeTemplate) {
        return res.status(400).json({
          error: "Aucun modèle d'impression actif défini pour les effets sur cette banque. Veuillez en créer un dans le Concepteur.",
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

    const newEffet = await prisma.effet.create({
      data: {
        bankId,
        templateId: selectedTemplateId,
        sapCode: (sapCode || "").trim(),
        beneficiary: trimmedBeneficiary,
        dueDate: new Date(dueDate),
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : new Date(),
        creationPlace: creationPlace || "Casablanca",
        cause: cause || "",
        status: "DRAFT",
        createdBy: req.user!.fullName || req.user!.username,
        entityId,
      },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "EFFET",
        entityId: newEffet.id,
        action: "CREATE",
        newValue: JSON.stringify({ sapCode: newEffet.sapCode, beneficiary: newEffet.beneficiary, amountNumeric: newEffet.amountNumeric }),
      },
    });

    return res.status(201).json(newEffet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la création de l'effet." });
  }
});

router.put("/:id", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { sapCode, beneficiary, dueDate, amountNumeric, amountWords, creationDate, creationPlace, cause, status, bankId, templateId } = req.body;

    const existingEffet = await prisma.effet.findUnique({ where: { id } });
    if (!existingEffet) return res.status(404).json({ error: "Effet non trouvé." });

    if (!isAdmin(req) && existingEffet.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const numAmount = amountNumeric !== undefined ? parseFloat(amountNumeric) : existingEffet.amountNumeric;
    const finalAmountWords = amountWords || convertAmountToWordsFr(numAmount);

    const updatedEffet = await prisma.effet.update({
      where: { id },
      data: {
        sapCode: sapCode !== undefined ? sapCode.trim() : existingEffet.sapCode,
        beneficiary: beneficiary !== undefined ? beneficiary.trim() : existingEffet.beneficiary,
        dueDate: dueDate ? new Date(dueDate) : existingEffet.dueDate,
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : existingEffet.creationDate,
        creationPlace: creationPlace !== undefined ? creationPlace : existingEffet.creationPlace,
        cause: cause !== undefined ? cause : existingEffet.cause,
        status: status !== undefined ? status : existingEffet.status,
        bankId: bankId !== undefined ? bankId : existingEffet.bankId,
        templateId: templateId !== undefined ? templateId : existingEffet.templateId,
      },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "EFFET",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ sapCode: existingEffet.sapCode, amountNumeric: existingEffet.amountNumeric }),
        newValue: JSON.stringify({ sapCode: updatedEffet.sapCode, amountNumeric: updatedEffet.amountNumeric }),
      },
    });

    return res.json(updatedEffet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la modification de l'effet." });
  }
});

router.delete("/:id", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const isHardDelete = req.query.hard === "true";
    const admin = isAdmin(req);

    const existingEffet = await prisma.effet.findUnique({ where: { id } });
    if (!existingEffet) return res.status(404).json({ error: "Effet non trouvé." });

    if (!admin && existingEffet.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    if (existingEffet.status === "PRINTED") {
      return res.status(400).json({ error: "Impossible de supprimer un effet déjà imprimé." });
    }

    if (isHardDelete) {
      if (!admin) {
        return res.status(403).json({ error: "Seul un administrateur peut supprimer définitivement un effet." });
      }

      await prisma.effet.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          entityType: "EFFET",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(existingEffet),
        },
      });

      return res.json({ message: "Effet supprimé définitivement." });
    }

    const softDeletedEffet = await prisma.effet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "EFFET",
        entityId: id,
        action: "SOFT_DELETE",
        oldValue: JSON.stringify({ deletedAt: null }),
        newValue: JSON.stringify({ deletedAt: softDeletedEffet.deletedAt }),
      },
    });

    return res.json({ message: "Effet supprimé (Soft Delete) avec succès.", effet: softDeletedEffet });
  } catch {
    return res.status(500).json({ error: "Erreur lors de la suppression de l'effet." });
  }
});

router.post("/:id/restore", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existingEffet = await prisma.effet.findUnique({ where: { id } });

    if (!existingEffet) {
      return res.status(404).json({ error: "Effet non trouvé." });
    }

    if (!isAdmin(req) && existingEffet.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const restoredEffet = await prisma.effet.update({
      where: { id },
      data: { deletedAt: null },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "EFFET",
        entityId: id,
        action: "RESTORE",
        oldValue: JSON.stringify({ deletedAt: existingEffet.deletedAt }),
        newValue: JSON.stringify({ deletedAt: null }),
      },
    });

    return res.json({ message: "Effet restauré avec succès.", effet: restoredEffet });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la restauration de l'effet." });
  }
});

router.get("/:id/print", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const effet = await prisma.effet.findUnique({
      where: { id },
      include: { bank: true, template: { include: { fields: true } } },
    });

    if (!effet) return res.status(404).json({ error: "Effet non trouvé." });

    if (!isAdmin(req) && effet.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    let template = effet.template;
    if (!template) {
      template = (await prisma.template.findFirst({
        where: { bankId: effet.bankId, documentType: "EFFET", isActive: true },
        include: { fields: true },
      })) as any;
    }

    if (!template || !template.fields || template.fields.length === 0) {
      return res.status(400).json({ error: "Aucun modèle d'impression actif configuré pour les effets sur cette banque." });
    }

    const formattedCreationDate = effet.creationDate
      ? new Date(effet.creationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const formattedDueDate = effet.dueDate
      ? new Date(effet.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const formattedAmount = `${effet.amountNumeric.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`;

    const dataMap: Record<string, string> = {
      beneficiary: effet.beneficiary,
      amountNumeric: formattedAmount,
      amountWords: effet.amountWords,
      creationDate: formattedCreationDate,
      creationPlace: effet.creationPlace || "",
      dueDate: formattedDueDate,
      cause: effet.cause || "",
      sapCode: effet.sapCode || "",
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
      backgroundImageUrl: null,
      fields: fieldsToPrint,
      drawGridOrBoxes: false,
    });

    await prisma.effet.update({ where: { id }, data: { status: "PRINTED", printedAt: new Date() } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "EFFET",
        entityId: id,
        action: "PRINT",
        newValue: JSON.stringify({ printedAt: new Date(), templateId: template.id }),
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="effet_${effet.sapCode || effet.id}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("Error generating effet print PDF:", error);
    return res.status(500).json({ error: "Erreur lors de la génération du PDF d'impression de l'effet." });
  }
});

export default router;
