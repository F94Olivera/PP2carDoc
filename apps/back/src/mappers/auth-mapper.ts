import type { Session, User } from "@supabase/supabase-js";

export const toLoginResponse = (user: User, session: Session) => ({
  user: { id: user.id, email: user.email ?? null },
  session: {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
  },
});
