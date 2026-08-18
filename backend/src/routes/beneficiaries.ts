import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../schemas/validate";
import { createBeneficiarySchema } from "../schemas/beneficiaries";

const router = Router();

function isAdmin(req: any): boolean {
  return req.user!.role === "ADMIN";
}

function entityWhere(req: any): Record<string, string> {
  return isAdmin(req) ? {} : { entityId: req.user!.entityId };
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      where: entityWhere(req),
      include: { entity: { select: { name: true, code: true } } },
      orderBy: { name: "asc" },
    });
    return res.json(beneficiaries);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des bénéficiaires." });
  }
});

router.post("/", authMiddleware, validate(createBeneficiarySchema), async (req, res) => {
  try {
    const { name, code, category } = req.body;

    const trimmedName = name.trim();
    const entityId = req.user!.entityId;

    const existing = await prisma.beneficiary.findFirst({
      where: { name: trimmedName, ...(entityId ? { entityId } : {}) },
    });

    let beneficiary;
    if (existing) {
      beneficiary = await prisma.beneficiary.update({
        where: { id: existing.id },
        data: {
          code: code ? code.trim() : existing.code,
          category: category || "FOURNISSEUR",
          active: true,
        },
      });
    } else {
      beneficiary = await prisma.beneficiary.create({
        data: {
          name: trimmedName,
          code: code ? code.trim() : null,
          category: category || "FOURNISSEUR",
          active: true,
          entityId,
        },
      });
    }

    return res.json(beneficiary);
  } catch {
    return res.status(500).json({ error: "Erreur lors de l'enregistrement du bénéficiaire." });
  }
});

router.delete("/", authMiddleware, async (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ error: "ID manquant" });
    }

    const beneficiary = await prisma.beneficiary.findUnique({ where: { id } });
    if (!beneficiary) {
      return res.status(404).json({ error: "Bénéficiaire non trouvé." });
    }

    if (!isAdmin(req) && beneficiary.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    await prisma.beneficiary.delete({ where: { id } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
