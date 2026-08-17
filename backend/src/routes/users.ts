import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        active: true,
        canEdit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch {
    return res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
  }
});

router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fullName, username, password, role, active, canEdit } = req.body;

    if (!fullName || !username || !password) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être renseignés." });
    }

    const bcrypt = require("bcryptjs");
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        role: role || "COMPTABLE",
        active: active !== undefined ? active : true,
        canEdit: canEdit !== undefined ? canEdit : true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        active: true,
        canEdit: true,
        createdAt: true,
        updatedAt: true,
      },
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
    const { fullName, role, active, canEdit, newPassword } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (role !== undefined) dataToUpdate.role = role;
    if (active !== undefined) dataToUpdate.active = active;
    if (canEdit !== undefined) dataToUpdate.canEdit = canEdit;

    if (newPassword && newPassword.trim() !== "") {
      const bcrypt = require("bcryptjs");
      dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        active: true,
        canEdit: true,
        createdAt: true,
        updatedAt: true,
      },
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

    if (id === req.user!.id) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte utilisateur." });
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

export default router;
