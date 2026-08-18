import { z } from "zod";

const templateFieldSchema = z.object({
  fieldKey: z.string().min(1, "fieldKey est obligatoire.").max(50),
  x: z.coerce.number({ message: "x doit être un nombre." }),
  y: z.coerce.number({ message: "y doit être un nombre." }),
  width: z.coerce.number().positive("La largeur doit être positive."),
  fontSize: z.coerce.number().positive().optional().default(10),
  fontFamily: z.string().max(100).optional().default("Helvetica"),
  align: z.enum(["LEFT", "CENTER", "RIGHT"]).optional().default("LEFT"),
  format: z.enum(["TEXT", "NUMBER", "DATE"]).optional().default("TEXT"),
});

export const createTemplateSchema = z.object({
  bankId: z.string().uuid("ID de banque invalide."),
  documentType: z.enum(["CHEQUE", "EFFET"], { message: "Le type de document doit être CHEQUE ou EFFET." }),
  name: z.string().min(1, "Le nom du modèle est obligatoire.").max(200).trim(),
  backgroundImageUrl: z.string().max(2000).optional().nullable(),
  physicalWidthMm: z.coerce.number().positive().optional().default(210),
  physicalHeightMm: z.coerce.number().positive().optional().default(100),
  isActive: z.coerce.boolean().optional().default(true),
  fields: z.array(templateFieldSchema).optional().default([]),
  entityIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  backgroundImageUrl: z.string().max(2000).optional().nullable(),
  physicalWidthMm: z.coerce.number().positive().optional(),
  physicalHeightMm: z.coerce.number().positive().optional(),
  isActive: z.coerce.boolean().optional(),
  fields: z.array(templateFieldSchema).optional(),
  entityIds: z.array(z.string().uuid()).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Au moins un champ doit être fourni." });

export const previewTemplateSchema = z.object({
  physicalWidthMm: z.coerce.number().positive().optional().default(210),
  physicalHeightMm: z.coerce.number().positive().optional().default(100),
  backgroundImageUrl: z.string().max(2000).optional().nullable(),
  fields: z.array(templateFieldSchema).optional().default([]),
  drawGridOrBoxes: z.coerce.boolean().optional().default(true),
  sampleData: z.record(z.string(), z.string()).optional().default({}),
});
