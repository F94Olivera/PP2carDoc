import { z } from "zod";

export const loginSchema = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(1).max(4096),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const bearerTokenSchema = z
  .string()
  .regex(/^Bearer [A-Za-z0-9._~+/-]+=*$/i)
  .transform((authorization) => authorization.slice(7));
