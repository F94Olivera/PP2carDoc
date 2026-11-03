export const ACCESS_TOKEN_MAX_AGE_SECONDS = 900;
export type UserRole = "GOD" | "MECHANIC" | "USER";
export type AuthUserResponse = {
  id: string;
  email: string | null;
  role: UserRole;
  customerId: string | null;
};
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

export const PASSWORD_RECOVERY_MESSAGE =
  "Si el email ingresado corresponde a una cuenta, recibirás un mensaje con un enlace para restablecer tu contraseña";
export type ForgotPasswordRequest = { email: string };
export type ForgotPasswordResponse = { message: string };
export const isValidPassword = (value: string) =>
  value.length >= 8 && new TextEncoder().encode(value).length <= 72;
