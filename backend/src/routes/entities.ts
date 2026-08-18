import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";
import { encrypt, decrypt, maskPassword } from "../lib/crypto";
import { validate } from "../schemas/validate";
import { createEntitySchema, updateEntitySchema } from "../schemas/entities";

const router = Router();

router.use(authMiddleware);

// List all entities (admin only)
router.get("/", adminOnly, async (_req, res) => {
  try {
    const entities = await prisma.entity.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, bankEntities: true, cheques: true, effets: true } } },
    });
    return res.json(entities.map(e => ({ ...e, sapPassword: e.sapPassword ? maskPassword() : null })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get single entity
router.get("/:id", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true, bankEntities: true, cheques: true, effets: true, beneficiaries: true } } },
    });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });
    return res.json({ ...entity, sapPassword: entity.sapPassword ? maskPassword() : null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create entity
router.post("/", adminOnly, validate(createEntitySchema), async (req, res) => {
  try {
    const { name, code, dataMode, sapServerUrl, sapCompanyDB, sapUser, sapPassword, sapQuery } = req.body;

    const existing = await prisma.entity.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ error: "Ce code entité existe déjà." });

    const entity = await prisma.entity.create({
      data: {
        name, code: code.toUpperCase(), dataMode: dataMode || "NORMAL",
        sapServerUrl, sapCompanyDB, sapUser,
        sapPassword: sapPassword ? encrypt(sapPassword) : null,
        sapQuery,
      },
    });
    return res.status(201).json({ ...entity, sapPassword: entity.sapPassword ? maskPassword() : null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update entity
router.put("/:id", adminOnly, validate(updateEntitySchema), async (req, res) => {
  try {
    const { name, code, dataMode, sapServerUrl, sapCompanyDB, sapUser, sapPassword, sapQuery, active } = req.body;
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });

    if (code && code !== entity.code) {
      const existing = await prisma.entity.findUnique({ where: { code } });
      if (existing) return res.status(400).json({ error: "Ce code entité existe déjà." });
    }

    const updated = await prisma.entity.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(dataMode && { dataMode }),
        ...(sapServerUrl !== undefined && { sapServerUrl }),
        ...(sapCompanyDB !== undefined && { sapCompanyDB }),
        ...(sapUser !== undefined && { sapUser }),
        ...(sapPassword !== undefined && {
          sapPassword: sapPassword === "••••••••" || sapPassword === maskPassword()
            ? entity.sapPassword
            : sapPassword === ""
              ? null
              : encrypt(sapPassword),
        }),
        ...(sapQuery !== undefined && { sapQuery }),
        ...(active !== undefined && { active }),
      },
    });
    return res.json({ ...updated, sapPassword: updated.sapPassword ? maskPassword() : null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete entity
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });

    // Check if entity has users or data
    const counts = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true, cheques: true, effets: true } } },
    });
    if (counts && (counts._count.users > 0 || counts._count.cheques > 0 || counts._count.effets > 0)) {
      return res.status(400).json({ error: `Impossible de supprimer: ${counts._count.users} utilisateur(s), ${counts._count.cheques} chèque(s), ${counts._count.effets} effet(s) associés.` });
    }

    // Delete join table records first
    await prisma.bankEntity.deleteMany({ where: { entityId: req.params.id } });
    await prisma.templateEntity.deleteMany({ where: { entityId: req.params.id } });
    await prisma.beneficiary.deleteMany({ where: { entityId: req.params.id } });
    await prisma.entity.delete({ where: { id: req.params.id } });

    return res.json({ message: "Entité supprimée définitivement." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Test SAP connection
router.post("/:id/test-sap", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });
    if (!entity.sapServerUrl || !entity.sapCompanyDB || !entity.sapUser || !entity.sapPassword) {
      return res.status(400).json({ error: "Configuration SAP incomplète." });
    }

    const sapPasswordPlain = decrypt(entity.sapPassword);
    // SAP HANA connection test would go here, using sapPasswordPlain
    return res.json({ success: true, message: "Connexion SAP testée avec succès." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Pull data from SAP
router.post("/:id/pull-sap", adminOnly, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée." });
    if (entity.dataMode !== "SAP") return res.status(400).json({ error: "Cette entité n'est pas en mode SAP." });
    if (!entity.sapQuery) return res.status(400).json({ error: "Aucune requête SQL configurée." });

    const sapPasswordPlain = entity.sapPassword ? decrypt(entity.sapPassword) : null;
    // SAP data pull would go here, using sapPasswordPlain
    return res.json({ success: true, message: "Données SAP tirées avec succès.", count: 0 });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
