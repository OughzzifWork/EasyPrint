import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(1, "Le nom complet est obligatoire.").max(200).trim(),
  username: z.string().min(2, "Le nom d'utilisateur doit contenir au moins 2 caractères.").max(100).trim(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").max(200),
  role: z.enum(["ADMIN", "COMPTABLE", "VISITEUR"]).default("COMPTABLE"),
  active: z.coerce.boolean().default(true),
  canEdit: z.coerce.boolean().default(true),
  entityId: z.string().uuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(200).trim().optional(),
  username: z.string().min(2).max(100).trim().optional(),
  role: z.enum(["ADMIN", "COMPTABLE", "VISITEUR"]).optional(),
  active: z.coerce.boolean().optional(),
  canEdit: z.coerce.boolean().optional(),
  newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").max(200).optional().or(z.literal("")),
  entityId: z.string().uuid().optional().nullable(),
}).refine(data => Object.keys(data).length > 0, { message: "Au moins un champ doit être fourni." });
