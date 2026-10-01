import { createClient } from "@supabase/supabase-js";
import type { LoginInput } from "../schemas/auth.js";

const createAuthClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
  }
  // Each request gets an isolated client: never share user sessions.
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

export const signInWithPassword = async (credentials: LoginInput) => {
  return createAuthClient().auth.signInWithPassword(credentials);
};

export const revokeSession = async (accessToken: string) => {
  return createAuthClient().auth.admin.signOut(accessToken, "local");
};

export const findUserByAccessToken = async (accessToken: string) => {
  return createAuthClient().auth.getUser(accessToken);
};
