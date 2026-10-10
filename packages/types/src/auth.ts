export const ACCESS_TOKEN_MAX_AGE_SECONDS = 900;
export type UserRole = "GOD" | "MECHANIC";
export type AuthUserResponse = { id: string; email: string | null; role: UserRole };
export type LoginRequest = { email: string; password: string };
export type AuthSessionResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
};
export type LoginResponse = { user: AuthUserResponse; session: AuthSessionResponse };
export type MeResponse = { user: AuthUserResponse };
