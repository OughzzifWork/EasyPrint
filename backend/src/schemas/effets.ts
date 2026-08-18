import { z } from "zod";

export const createEffetSchema = z.object({
  bankId: z.string().uuid("ID de banque invalide."),
  templateId: z.string().uuid().optional().nullable(),
  sapCode: z.string().max(100).trim().optional().default(""),
  beneficiary: z.string().min(1, "Le bénéficiaire est obligatoire.").max(200).trim(),
  dueDate: z.coerce.date({ message: "La date d'échéance est invalide." }),
  amountNumeric: z.coerce.number().positive("Le montant doit être positif.").max(999999999, "Montant trop élevé."),
  amountWords: z.string().max(500).optional(),
  creationDate: z.coerce.date().optional(),
  creationPlace: z.string().max(100).trim().optional().default("Casablanca"),
  cause: z.string().max(500).trim().optional().default(""),
});

export const updateEffetSchema = z.object({
  bankId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional().nullable(),
  sapCode: z.string().max(100).trim().optional(),
  beneficiary: z.string().min(1).max(200).trim().optional(),
  dueDate: z.coerce.date().optional(),
  amountNumeric: z.coerce.number().positive().max(999999999).optional(),
  amountWords: z.string().max(500).optional(),
  creationDate: z.coerce.date().optional(),
  creationPlace: z.string().max(100).trim().optional(),
  cause: z.string().max(500).trim().optional(),
  status: z.enum(["DRAFT", "PRINTED", "VOID"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Au moins un champ doit être fourni." });
