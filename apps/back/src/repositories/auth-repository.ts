import { createClient } from "@supabase/supabase-js";
import type { LoginInput } from "../schemas/auth.js";

const createAuthClient = () => {
  const url = process.env.SUPABASE_URL;
  // Edge injects these for the current project, including the local Docker network.
  const keys = process.env.SUPABASE_PUBLISHABLE_KEYS;
  const key =
    (keys ? JSON.parse(keys).default : undefined) ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

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

export const generateRecoveryLink = async (email: string) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Recovery admin configuration missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth.admin.generateLink({ type: "recovery", email });
};

export const sendRecoveryEmail = async (link: string) => {
  const { RESEND_API_KEY: key, RESEND_TEST_TO: to, RESEND_FROM: from } = process.env;
  if (!key || !to || !from) throw new Error("Recovery mail configuration missing");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Restablecer contraseña de carDoc",
      text: `Abrí este enlace para restablecer tu contraseña de carDoc: ${link}\nEl enlace vence en una hora y es de un solo uso. Si no lo solicitaste, ignorá este correo.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Recovery mail delivery failed");
};
