import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { validate } from "../schemas/validate";
import { loginSchema } from "../schemas/auth";
import { JWT_SECRET } from "../lib/config";

const router = Router();

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: { entity: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Ce compte d'utilisateur est désactivé. Contactez votre administrateur." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      entityId: user.entityId,
      entityName: user.entity?.name || null,
      entityDataMode: user.entity?.dataMode || null,
      canEdit: user.canEdit,
      active: user.active,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

    return res.json({
      token,
      user: tokenPayload,
    });
  } catch (error: any) {
    console.error("[Auth Error]", error.message);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
