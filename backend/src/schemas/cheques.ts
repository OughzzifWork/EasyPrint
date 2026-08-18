import { z } from "zod";

export const createChequeSchema = z.object({
  bankId: z.string().uuid("ID de banque invalide."),
  templateId: z.string().uuid().optional().nullable(),
  beneficiary: z.string().min(1, "Le bénéficiaire est obligatoire.").max(200).trim(),
  amountNumeric: z.coerce.number().positive("Le montant doit être positif.").max(999999999, "Montant trop élevé."),
  amountWords: z.string().max(500).optional(),
  creationDate: z.coerce.date().optional(),
  creationPlace: z.string().max(100).trim().optional().default("Casablanca"),
});

export const updateChequeSchema = z.object({
  bankId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional().nullable(),
  beneficiary: z.string().min(1).max(200).trim().optional(),
  amountNumeric: z.coerce.number().positive().max(999999999).optional(),
  amountWords: z.string().max(500).optional(),
  creationDate: z.coerce.date().optional(),
  creationPlace: z.string().max(100).trim().optional(),
  status: z.enum(["DRAFT", "PRINTED", "VOID"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Au moins un champ doit être fourni." });
