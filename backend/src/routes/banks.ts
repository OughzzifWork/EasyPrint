import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  try {
    const banks = await prisma.bank.findMany({
      include: {
        _count: { select: { templates: true, cheques: true, effets: true } },
      },
      orderBy: { code: "asc" },
    });
    return res.json(banks);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des banques." });
  }
});

router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, code, active } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Le nom et le code de la banque sont obligatoires." });
    }

    const formattedCode = code.trim().toUpperCase();
    const existingBank = await prisma.bank.findUnique({ where: { code: formattedCode } });
    if (existingBank) {
      return res.status(400).json({ error: "Une banque avec ce code existe déjà." });
    }

    const newBank = await prisma.bank.create({
      data: {
        name: name.trim(),
        code: formattedCode,
        active: active !== undefined ? active : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "BANK",
        entityId: newBank.id,
        action: "CREATE",
        newValue: JSON.stringify(newBank),
      },
    });

    return res.status(201).json(newBank);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la création de la banque." });
  }
});

router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, active } = req.body;

    const existingBank = await prisma.bank.findUnique({ where: { id } });
    if (!existingBank) {
      return res.status(404).json({ error: "Banque non trouvée." });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (code !== undefined) dataToUpdate.code = code.trim().toUpperCase();
    if (active !== undefined) dataToUpdate.active = active;

    const updatedBank = await prisma.bank.update({ where: { id }, data: dataToUpdate });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "BANK",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify(existingBank),
        newValue: JSON.stringify(updatedBank),
      },
    });

    return res.json(updatedBank);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la mise à jour de la banque." });
  }
});

router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const isHardDelete = req.query.hard === "true";

    const existingBank = await prisma.bank.findUnique({ where: { id } });
    if (!existingBank) {
      return res.status(404).json({ error: "Banque non trouvée." });
    }

    if (isHardDelete) {
      await prisma.$transaction(async (tx) => {
        await tx.cheque.deleteMany({ where: { bankId: id } });
        await tx.effet.deleteMany({ where: { bankId: id } });
        const templates = await tx.template.findMany({ where: { bankId: id }, select: { id: true } });
        const templateIds = templates.map((t) => t.id);
        if (templateIds.length > 0) {
          await tx.templateField.deleteMany({ where: { templateId: { in: templateIds } } });
          await tx.template.deleteMany({ where: { bankId: id } });
        }
        await tx.bank.delete({ where: { id } });
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          entityType: "BANK",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(existingBank),
        },
      });

      return res.json({ message: "Banque et ses modèles/documents supprimés définitivement." });
    }

    const toggledBank = await prisma.bank.update({
      where: { id },
      data: { active: !existingBank.active },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "BANK",
        entityId: id,
        action: toggledBank.active ? "ACTIVATE" : "DEACTIVATE",
        oldValue: JSON.stringify({ active: existingBank.active }),
        newValue: JSON.stringify({ active: toggledBank.active }),
      },
    });

    return res.json(toggledBank);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur lors de la modification ou suppression de la banque." });
  }
});

export default router;
