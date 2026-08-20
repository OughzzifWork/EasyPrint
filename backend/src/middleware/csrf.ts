import { Request, Response, NextFunction } from "express";

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());

export function originCheck(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  if (req.path === "/auth/login") {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    res.status(403).json({ error: "En-tête d'origine manquant." });
    return;
  }

  let originUrl: string;
  try {
    originUrl = origin.startsWith("http") ? new URL(origin).origin : origin;
  } catch {
    res.status(403).json({ error: "Origine de la requête invalide." });
    return;
  }

  if (ALLOWED_ORIGINS.includes(originUrl)) {
    next();
    return;
  }

  res.status(403).json({ error: "Origine non autorisée." });
}
