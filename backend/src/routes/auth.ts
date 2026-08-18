import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { validate } from "../schemas/validate";
import { loginSchema } from "../schemas/auth";

const router = Router();
const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  console.error("[FATAL] JWT_SECRET is not set in environment variables.");
  process.exit(1);
}
const JWT_SECRET: string = JWT_SECRET_RAW;

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
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

export default router;
