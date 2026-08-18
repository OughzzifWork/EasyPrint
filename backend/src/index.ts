import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";
import { originCheck } from "./middleware/csrf";

dotenv.config();

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import banksRoutes from "./routes/banks";
import beneficiariesRoutes from "./routes/beneficiaries";
import templatesRoutes from "./routes/templates";
import chequesRoutes from "./routes/cheques";
import effetsRoutes from "./routes/effets";
import auditRoutes from "./routes/audit";
import entitiesRoutes from "./routes/entities";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, false);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: "2mb" }));

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: "Trop de requêtes. Réessayez dans 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const printLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: "Trop d'impressions en cours. Réessayez dans 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/cheques", printLimiter);
app.use("/api/effets", printLimiter);
app.use("/api", apiLimiter);

app.use("/api", originCheck);

app.use("/api/entities", entitiesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/banks", banksRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/cheques", chequesRoutes);
app.use("/api/effets", effetsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
});

export default app;
