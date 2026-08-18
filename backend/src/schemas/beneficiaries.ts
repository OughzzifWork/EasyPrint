import { z } from "zod";

export const createBeneficiarySchema = z.object({
  name: z.string().min(1, "Le nom du bénéficiaire est obligatoire.").max(200).trim(),
  code: z.string().max(50).trim().optional().nullable(),
  category: z.enum(["FOURNISSEUR", "CLIENT", "EMPLOYE", "AUTRE"]).default("FOURNISSEUR"),
});
