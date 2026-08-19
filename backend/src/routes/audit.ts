import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const role = req.user!.role;
  if (role !== "ADMIN" && role !== "COMPTABLE") {
    return res.status(403).json({ error: "Accès refusé. Rôle Administrateur ou Comptable requis." });
  }

  const entityType = req.query.entityType as string;
  const action = req.query.action as string;
  const userId = req.query.userId as string;
  const search = req.query.search as string;

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (search) {
    where.OR = [
      { entityId: { contains: search, mode: 'insensitive' } },
      { oldValue: { contains: search, mode: 'insensitive' } },
      { newValue: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  try {
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return res.json(auditLogs);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des journaux d'audit." });
  }
});

export default router;
