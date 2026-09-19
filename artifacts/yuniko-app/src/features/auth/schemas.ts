import { z } from "zod";

const strongPassword = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .max(128, "Le mot de passe est trop long.")
  .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir un symbole.");

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
  displayName: z.string().min(1).max(80),
  password: strongPassword,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
