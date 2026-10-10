import type { AuthUserResponse, LoginResponse, UserRole } from "@cardoc/types";
import type { Session, User } from "@supabase/supabase-js";

export const toUserResponse = (user: User, role: UserRole): AuthUserResponse => ({
  id: user.id,
  email: user.email ?? null,
  role,
});
export const toLoginResponse = (user: AuthUserResponse, session: Session): LoginResponse => ({
  user,
  session: {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
  },
});
