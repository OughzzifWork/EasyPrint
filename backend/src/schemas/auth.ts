import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur est obligatoire.").max(100),
  password: z.string().min(1, "Le mot de passe est obligatoire.").max(200),
});
