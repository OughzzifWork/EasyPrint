import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  console.error("[FATAL] JWT_SECRET is not set in environment variables.");
  process.exit(1);
}
const JWT_SECRET: string = JWT_SECRET_RAW;

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
    req.user = decoded;
    next();
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
