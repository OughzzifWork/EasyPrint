import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";
import { validate } from "../schemas/validate";
import { createBankSchema, updateBankSchema } from "../schemas/banks";
import { isAdmin } from "../lib/utils";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const where: any = {};

    if (!isAdmin(req)) {
      where.bankEntities = {
        some: { entityId: req.user!.entityId },
      };
    }

    const banks = await prisma.bank.findMany({
      where,
      include: {
        _count: { select: { templates: true, cheques: true, effets: true } },
        bankEntities: { include: { entity: true } },
      },
      orderBy: { code: "asc" },
    });
    return res.json(banks);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des banques." });
  }
});

router.post("/", authMiddleware, adminOnly, validate(createBankSchema), async (req, res) => {
  try {
    const { name, code, active, entityIds, logoUrl } = req.body;

    const formattedCode = code.trim().toUpperCase();
    const existingBank = await prisma.bank.findFirst({
      where: { code: formattedCode },
    });
    if (existingBank) {
      return res.status(400).json({ error: "Une banque avec ce code existe déjà." });
    }

    const newBank = await prisma.bank.create({
      data: {
        name: name.trim(),
        code: formattedCode,
        active: active !== undefined ? active : true,
        logoUrl: logoUrl || null,
        bankEntities: {
          create: (entityIds || []).map((entityId: string) => ({ entityId })),
        },
      },
      include: { bankEntities: { include: { entity: true } } },
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
    console.error("[Banks Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la création de la banque." });
  }
});

router.put("/:id", authMiddleware, adminOnly, validate(updateBankSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, active, entityIds, logoUrl } = req.body;

    const existingBank = await prisma.bank.findUnique({ where: { id } });
    if (!existingBank) {
      return res.status(404).json({ error: "Banque non trouvée." });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (code !== undefined) dataToUpdate.code = code.trim().toUpperCase();
    if (active !== undefined) dataToUpdate.active = active;
    if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl || null;

    const updatedBank = await prisma.$transaction(async (tx) => {
      if (entityIds !== undefined) {
        await tx.bankEntity.deleteMany({ where: { bankId: id } });
        if (entityIds.length > 0) {
          await tx.bankEntity.createMany({
            data: entityIds.map((entityId: string) => ({ bankId: id, entityId })),
          });
        }
      }

      return tx.bank.update({
        where: { id },
        data: dataToUpdate,
        include: { bankEntities: { include: { entity: true } } },
      });
    });

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
    console.error("[Banks Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la mise à jour de la banque." });
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
        await tx.bankEntity.deleteMany({ where: { bankId: id } });
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
    console.error("[Banks Error]", error.message);
    return res.status(500).json({ error: "Erreur lors de la modification ou suppression de la banque." });
  }
});

export default router;
