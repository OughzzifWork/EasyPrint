import { z } from "zod";

export const createBankSchema = z.object({
  name: z.string().min(1, "Le nom de la banque est obligatoire.").max(200).trim(),
  code: z.string().min(1, "Le code est obligatoire.").max(20).trim().toUpperCase(),
  active: z.coerce.boolean().default(true),
  entityIds: z.array(z.string().uuid()).default([]),
  logoUrl: z.string().url("URL invalide.").max(2000).optional().nullable(),
}).refine(
  data => !data.logoUrl || data.logoUrl.startsWith("data:") || data.logoUrl.startsWith("http"),
  { message: "L'URL du logo doit être une URL valide ou une image base64." }
);

export const updateBankSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  code: z.string().min(1).max(20).trim().toUpperCase().optional(),
  active: z.coerce.boolean().optional(),
  entityIds: z.array(z.string().uuid()).optional(),
  logoUrl: z.string().max(2000).optional().nullable(),
}).refine(data => Object.keys(data).length > 0, { message: "Au moins un champ doit être fourni." });
