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
    if (!profile || !["GOD", "MECHANIC"].includes(profile.role))
      return { outcome: "unauthorized" } as const;
    return {
      outcome: "success",
      response: { user: toUserResponse(data.user, profile.role) },
      authorization: { ...identity, role: profile.role },
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
