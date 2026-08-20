import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { JWT_SECRET } from "../lib/config";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  entityId: string | null;
  canEdit: boolean;
  active: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, active: true, role: true, canEdit: true, entityId: true },
    }).then((dbUser) => {
      if (!dbUser || !dbUser.active) {
        return res.status(401).json({ error: "Compte désactivé ou supprimé." });
      }
      req.user = {
        ...decoded,
        active: dbUser.active,
        role: dbUser.role,
        canEdit: dbUser.canEdit,
        entityId: dbUser.entityId,
      };
      next();
    }).catch(() => {
      return res.status(500).json({ error: "Erreur d'authentification." });
    });
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès refusé. Rôle Administrateur requis." });
  }
  next();
}

export function canEditOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.canEdit === false) {
    return res.status(403).json({ error: "Accès refusé. Droit d'édition requis." });
  }
  next();
}
