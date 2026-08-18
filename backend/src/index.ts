import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    const allowed = process.env.FRONTEND_URL || "http://localhost:3000";
    callback(null, origin === allowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));

app.use("/api/entities", entitiesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/banks", banksRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/cheques", chequesRoutes);
app.use("/api/effets", effetsRoutes);
app.use("/api/audit", auditRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
});

export default app;
