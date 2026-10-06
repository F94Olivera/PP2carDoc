import { createClient } from "@supabase/supabase-js";
import type { LoginInput } from "../schemas/auth.js";

const createAuthClient = () => {
  const url = process.env.SUPABASE_URL;
  // Edge injects these for the current project, including the local Docker network.
  const keys = process.env.SUPABASE_PUBLISHABLE_KEYS;
  const key = (keys ? JSON.parse(keys).default : undefined) ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase runtime URL and public key are required");
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
