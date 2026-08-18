import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";

const router = Router();

router.post("/reset-db", authMiddleware, adminOnly, async (req, res) => {
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u) => u.id);

    if (adminIds.length === 0) {
      return res.status(500).json({ error: "Aucun administrateur trouvé dans la base." });
    }

    if (!adminIds.includes(req.user!.id)) {
      return res.status(403).json({ error: "Seul l'administrateur système peut réinitialiser la base." });
    }

    await prisma.$transaction([
      prisma.auditLog.deleteMany({}),
      prisma.templateField.deleteMany({}),
      prisma.cheque.deleteMany({}),
      prisma.effet.deleteMany({}),
      prisma.beneficiary.deleteMany({}),
      prisma.templateEntity.deleteMany({}),
      prisma.template.deleteMany({}),
      prisma.bankEntity.deleteMany({}),
      prisma.bank.deleteMany({}),
      prisma.user.deleteMany({ where: { id: { notIn: adminIds } } }),
      prisma.entity.deleteMany({}),
    ]);

    return res.json({ message: "Base réinitialisée. Seuls les administrateurs système ont été conservés." });
  } catch (error) {
    console.error("[Reset DB Error]", error);
    return res.status(500).json({ error: "Erreur lors de la réinitialisation de la base de données." });
  }
});

export default router;
