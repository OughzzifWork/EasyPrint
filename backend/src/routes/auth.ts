import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "impce-super-secret-jwt-key-2026-antigravity";

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Veuillez saisir votre nom d'utilisateur et votre mot de passe." });
    }

    const user = await prisma.user.findUnique({ where: { username } });

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
