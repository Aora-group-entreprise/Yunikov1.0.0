import { z } from "zod";
export const signInSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const signUpSchema = z.object({ email: z.string().email(), username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/), displayName: z.string().min(1).max(80), password: z.string().min(6) });
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
