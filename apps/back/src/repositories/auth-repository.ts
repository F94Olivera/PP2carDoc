import { createClient } from "@supabase/supabase-js";
import type { LoginInput } from "../schemas/auth.js";

export const signInWithPassword = async (credentials: LoginInput) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
  }
  // Each request gets an isolated client: never share user sessions.
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.auth.signInWithPassword(credentials);
};
