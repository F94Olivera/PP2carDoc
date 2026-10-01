import { signInWithPassword } from "../repositories/auth-repository.js";
import { toLoginResponse } from "../mappers/auth-mapper.js";
import type { LoginInput } from "../schemas/auth.js";

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
