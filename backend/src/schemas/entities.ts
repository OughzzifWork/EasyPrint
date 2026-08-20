import { z } from "zod";

export const createEntitySchema = z.object({
  name: z.string().min(1, "Le nom est obligatoire.").max(200).trim(),
  code: z.string().min(1, "Le code est obligatoire.").max(20).trim().toUpperCase(),
  dataMode: z.enum(["NORMAL", "SAP"]).default("NORMAL"),
  defaultCreationPlace: z.string().max(200).default("Casablanca"),
  bankIds: z.array(z.string()).optional(),
  sapServerUrl: z.string().max(500).optional().nullable(),
  sapCompanyDB: z.string().max(200).optional().nullable(),
  sapUser: z.string().max(200).optional().nullable(),
  sapPassword: z.string().max(500).optional().nullable(),
  sapQuery: z.string().max(10000).optional().nullable(),
});

export const updateEntitySchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  code: z.string().min(1).max(20).trim().toUpperCase().optional(),
  dataMode: z.enum(["NORMAL", "SAP"]).optional(),
  defaultCreationPlace: z.string().max(200).optional(),
  bankIds: z.array(z.string()).optional(),
  sapServerUrl: z.string().max(500).optional().nullable(),
  sapCompanyDB: z.string().max(200).optional().nullable(),
  sapUser: z.string().max(200).optional().nullable(),
  sapPassword: z.string().max(500).optional().nullable(),
  sapQuery: z.string().max(10000).optional().nullable(),
  active: z.coerce.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Au moins un champ doit être fourni." });
