import { Buffer } from "node:buffer";
import { z } from "zod";
import { ACCESS_TOKEN_MAX_AGE_SECONDS, type UserRole } from "@cardoc/types";

export type VerifiedIdentity = {
  userId: string;
  issuedAt: number;
  sessionId: string;
  expiresAt: number;
};
export type AuthorizationContext = VerifiedIdentity & { role: UserRole };
const claimsSchema = z.object({
  iat: z.number().int().positive(),
  sub: z.uuid(),
  session_id: z.uuid(),
  exp: z.number().int().positive(),
  role: z.literal("authenticated"),
});

// Only call after Supabase has verified the token. Decoding is not authentication.
export const identityFromVerifiedToken = (
  token: string,
  verifiedUserId: string,
  now = Date.now(),
): VerifiedIdentity | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const claims = claimsSchema.parse(
      JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")),
    );
    const expiresAt = Math.min(claims.exp, claims.iat + ACCESS_TOKEN_MAX_AGE_SECONDS);
    if (claims.sub !== verifiedUserId || expiresAt * 1000 <= now || claims.iat * 1000 > now + 30000)
      return null;
    return { userId: claims.sub, issuedAt: claims.iat, sessionId: claims.session_id, expiresAt };
  } catch {
    return null;
  }
};

export const canChooseMechanic = (context: AuthorizationContext, mechanicId?: string) =>
  mechanicId === undefined || mechanicId === context.userId || context.role === "GOD";

export const classifyAuthenticationError = (error: {
  status?: number;
  code?: string;
  name?: string;
}) => {
  if (error.status === 429) return "rate_limited" as const;
  if (
    error.status === 401 ||
    error.status === 403 ||
    error.name === "AuthSessionMissingError" ||
    ["user_not_found", "bad_jwt", "session_not_found"].includes(error.code ?? "")
  )
    return "unauthorized" as const;
  return "unavailable" as const;
};
