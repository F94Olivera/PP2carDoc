import pino from "pino";
import { generateRecoveryLink, sendRecoveryEmail } from "../repositories/auth-repository.js";
const recoveryLogger = pino({ level: process.env.LOG_LEVEL ?? "info" });
import {
  findUserByAccessToken,
  revokeSession,
  signInWithPassword,
} from "../repositories/auth-repository.js";
import { isInactiveSession } from "../database.js";
import { findCurrentUserProfile } from "../repositories/user-profile-repository.js";
import {
  classifyAuthenticationError,
  identityFromVerifiedToken,
  metadataFromVerifiedToken,
} from "../schemas/authorization.js";
import { toLoginResponse, toUserResponse } from "../mappers/auth-mapper.js";
import type { LoginInput } from "../schemas/auth.js";

export const getCurrentUser = async (accessToken: string) => {
  const { data, error } = await findUserByAccessToken(accessToken);
  if (error) return { outcome: classifyAuthenticationError(error) };
  if (!data.user || data.user.is_anonymous) return { outcome: "unauthorized" } as const;
  const identity = identityFromVerifiedToken(accessToken, data.user.id);
  if (!identity) return { outcome: "unauthorized" } as const;
  try {
    const profile = await findCurrentUserProfile(identity);
    const metadata = metadataFromVerifiedToken(accessToken);
    if (
      !profile ||
      !metadata ||
      metadata.user_role !== profile.role ||
      metadata.customerId !== profile.customerId ||
      (profile.role === "USER" && !profile.customerId)
    )
      return { outcome: "unauthorized" } as const;
    return {
      outcome: "success",
      response: { user: toUserResponse(data.user, profile.role, profile.customerId) },
      authorization: { ...identity, role: profile.role, customerId: profile.customerId },
    } as const;
  } catch (error) {
    if (isInactiveSession(error)) return { outcome: "unauthorized" } as const;
    return { outcome: "unavailable" } as const;
  }
};

export const login = async (credentials: LoginInput) => {
  const { data, error } = await signInWithPassword(credentials);
  if (error) {
    if (error.status === 429) return { outcome: "rate_limited" } as const;
    if (error.code === "invalid_credentials" || error.code === "email_not_confirmed") {
      return { outcome: "unauthorized" } as const;
    }
    return { outcome: "unavailable" } as const;
  }
  if (!data.user || !data.session) return { outcome: "unavailable" } as const;
  const current = await getCurrentUser(data.session.access_token);
  if (current.outcome !== "success") {
    await revokeSession(data.session.access_token);
    return { outcome: current.outcome } as const;
  }
  return {
    outcome: "success",
    response: toLoginResponse(current.response.user, data.session),
  } as const;
};

export const logout = async (accessToken: string) => {
  const { error } = await revokeSession(accessToken);
  if (!error) return { outcome: "success" } as const;
  if (error.status === 429) return { outcome: "rate_limited" } as const;
  if (error.status === 401 || error.status === 403 || error.status === 404) {
    return { outcome: "unauthorized" } as const;
  }
  return { outcome: "unavailable" } as const;
};

export const forgotPassword = async (email: string) => {
  // Never log provider errors: they can contain addresses, links or credentials.
  try {
    const origin = process.env.FRONTEND_URL;
    if (!origin) throw new Error("Missing frontend URL");
    const link = new URL("/reset-password", origin);
    if (!["http:", "https:"].includes(link.protocol)) throw new Error("Invalid frontend URL");
    const { data, error } = await generateRecoveryLink(email);
    if (error || !data.properties?.hashed_token) {
      recoveryLogger.warn("Password recovery link generation failed");
      return;
    }
    link.searchParams.set("token_hash", data.properties.hashed_token);
    await sendRecoveryEmail(link.toString());
  } catch {
    recoveryLogger.warn("Password recovery unavailable or delivery failed");
  }
};
