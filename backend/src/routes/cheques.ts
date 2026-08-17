import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, canEditOnly } from "../middleware/auth";
import { convertAmountToWordsFr } from "../lib/numberToWordsFr";
import { generateCalibratedPDF, FieldToPrint } from "../lib/pdfGenerator";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const bankId = req.query.bankId as string;
  const status = req.query.status as string;
  const search = req.query.search as string;
  const includeDeleted = req.query.includeDeleted === "true";

  const where: any = {};
  if (!includeDeleted) where.deletedAt = null;
  if (bankId) where.bankId = bankId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { beneficiary: { contains: search } },
      { creationPlace: { contains: search } },
    ];
  }

  try {
    const cheques = await prisma.cheque.findMany({
      where,
      include: { bank: true, template: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(cheques);
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
    return res.json(cheque);
  } catch {
    return res.status(500).json({ error: "Erreur lors du chargement du chèque." });
  }
});

router.post("/", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { bankId, templateId, beneficiary, amountNumeric, amountWords, creationDate, creationPlace } = req.body;

    if (!bankId || !beneficiary || !amountNumeric) {
      return res.status(400).json({ error: "La banque, le bénéficiaire et le montant sont obligatoires." });
    }

    let selectedTemplateId = templateId;
    if (!selectedTemplateId) {
      const activeTemplate = await prisma.template.findFirst({
        where: { bankId, documentType: "CHEQUE", isActive: true },
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

    if (trimmedBeneficiary) {
      await prisma.beneficiary.upsert({
        where: { name: trimmedBeneficiary },
        update: { active: true },
        create: { name: trimmedBeneficiary, category: "FOURNISSEUR" },
      }).catch(() => {});
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

router.put("/:id", authMiddleware, canEditOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { beneficiary, amountNumeric, amountWords, creationDate, creationPlace, status, bankId, templateId } = req.body;

    const existingCheque = await prisma.cheque.findUnique({ where: { id } });
    if (!existingCheque) return res.status(404).json({ error: "Chèque non trouvé." });

    const numAmount = amountNumeric !== undefined ? parseFloat(amountNumeric) : existingCheque.amountNumeric;
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
    const isAdmin = req.user!.role === "ADMIN";

    const existingCheque = await prisma.cheque.findUnique({ where: { id } });
    if (!existingCheque) return res.status(404).json({ error: "Chèque non trouvé." });

    if (existingCheque.status === "PRINTED") {
      return res.status(400).json({ error: "Impossible de supprimer un chèque déjà imprimé." });
    }

    if (isHardDelete) {
      if (!isAdmin) {
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
    const formattedAmount = `${cheque.amountNumeric.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`;

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
      backgroundImageUrl: null,
      fields: fieldsToPrint,
      drawGridOrBoxes: false,
    });

    await prisma.cheque.update({ where: { id }, data: { status: "PRINTED" } });

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
