import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      orderBy: { name: "asc" },
    });
    return res.json(beneficiaries);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des bénéficiaires." });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, code, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom du bénéficiaire est obligatoire." });
    }

    const trimmedName = name.trim();

    const beneficiary = await prisma.beneficiary.upsert({
      where: { name: trimmedName },
      update: {
        code: code ? code.trim() : undefined,
        category: category || "FOURNISSEUR",
        active: true,
      },
      create: {
        name: trimmedName,
        code: code ? code.trim() : null,
        category: category || "FOURNISSEUR",
        active: true,
      },
    });

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

    await prisma.beneficiary.delete({ where: { id } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
