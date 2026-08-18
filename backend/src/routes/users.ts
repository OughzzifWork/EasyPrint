import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";

const router = Router();

const userSelect = {
  id: true,
  fullName: true,
  username: true,
  role: true,
  active: true,
  canEdit: true,
  entityId: true,
  createdAt: true,
  updatedAt: true,
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: isAdmin(req) ? {} : { entityId: req.user!.entityId },
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
  }
});

router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fullName, username, password, role, active, canEdit, entityId } = req.body;

    if (!fullName || !username || !password) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être renseignés." });
    }

    const bcrypt = require("bcryptjs");
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const targetEntityId = isAdmin(req) && entityId ? entityId : req.user!.entityId;

    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        role: role || "COMPTABLE",
        active: active !== undefined ? active : true,
        canEdit: canEdit !== undefined ? canEdit : true,
        entityId: targetEntityId,
      },
      select: userSelect,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "USER",
        entityId: newUser.id,
        action: "CREATE",
        newValue: JSON.stringify(newUser),
      },
    });

    return res.status(201).json(newUser);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur serveur lors de la création de l'utilisateur." });
  }
});

router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, username, role, active, canEdit, newPassword, entityId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    if (!isAdmin(req) && existingUser.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (username !== undefined) {
      if (username.trim() !== existingUser.username) {
        const taken = await prisma.user.findUnique({ where: { username: username.trim() } });
        if (taken) return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
        dataToUpdate.username = username.trim();
      }
    }
    if (role !== undefined) dataToUpdate.role = role;
    if (active !== undefined) dataToUpdate.active = active;
    if (canEdit !== undefined) dataToUpdate.canEdit = canEdit;
    if (isAdmin(req) && entityId !== undefined) dataToUpdate.entityId = entityId;

    if (newPassword && newPassword.trim() !== "") {
      const bcrypt = require("bcryptjs");
      dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: userSelect,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "USER",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ fullName: existingUser.fullName, role: existingUser.role, active: existingUser.active, canEdit: existingUser.canEdit }),
        newValue: JSON.stringify(updatedUser),
      },
    });

    return res.json(updatedUser);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erreur serveur lors de la mise à jour de l'utilisateur." });
  }
});

router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const isHardDelete = req.query.hard === "true";

    if (id === req.user!.id) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte utilisateur." });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    if (!isAdmin(req) && targetUser.entityId !== req.user!.entityId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    if (isHardDelete) {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Seul un administrateur peut supprimer définitivement un utilisateur." });
      }

      await prisma.user.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          entityType: "USER",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(targetUser),
        },
      });

      return res.json({ message: "Utilisateur supprimé définitivement." });
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entityType: "USER",
        entityId: id,
        action: "DEACTIVATE",
        oldValue: JSON.stringify({ active: true }),
        newValue: JSON.stringify({ active: false }),
      },
    });

    return res.json({ message: "Compte utilisateur désactivé avec succès." });
  } catch {
    return res.status(500).json({ error: "Erreur lors de la désactivation de l'utilisateur." });
  }
});

function isAdmin(req: any): boolean {
  return req.user!.role === "ADMIN";
}

export default router;
