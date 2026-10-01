import {
  findUserByAccessToken,
  revokeSession,
  signInWithPassword,
} from "../repositories/auth-repository.js";
import { toLoginResponse, toUserResponse } from "../mappers/auth-mapper.js";
import type { LoginInput } from "../schemas/auth.js";

export const getCurrentUser = async (accessToken: string) => {
  const { data, error } = await findUserByAccessToken(accessToken);
  if (error) {
    if (error.status === 429) return { outcome: "rate_limited" } as const;
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.code === "user_not_found" ||
      error.code === "bad_jwt"
    ) {
      return { outcome: "unauthorized" } as const;
    }
    return { outcome: "unavailable" } as const;
  }
  if (!data.user) return { outcome: "unauthorized" } as const;
  return { outcome: "success", response: { user: toUserResponse(data.user) } } as const;
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
  return { outcome: "success", response: toLoginResponse(data.user, data.session) } as const;
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
