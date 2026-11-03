"use client";
import type { ForgotPasswordRequest, ForgotPasswordResponse } from "@cardoc/types";
import { fetchApi } from "./api-client";
import { createClient } from "./supabase/client";

export const requestPasswordRecovery = async (
  input: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> => {
  const response = await fetchApi("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) throw new Error("No se pudo procesar la solicitud. Intentá nuevamente.");
  return response.json();
};

// One promise per page lifetime, including Strict Mode's effect replay.
// Tokens stay only in memory and are removed from the address bar immediately.
let verification: Promise<boolean> | undefined;
let lastToken: string | null = null;
export const verifyRecoveryLink = () => {
  const url = new URL(window.location.href);
  const token_hash = url.searchParams.get("token_hash");
  if (verification && (!token_hash || token_hash === lastToken)) return verification;
  lastToken = token_hash;
  passwordUpdated = false;
  window.history.replaceState(null, "", url.pathname);
  verification = (async () => {
    if (!token_hash) return false;
    try {
      const { data, error } = await createClient().auth.verifyOtp({ token_hash, type: "recovery" });
      return !error && Boolean(data.session);
    } catch {
      return false;
    }
  })();
  return verification;
};

let passwordUpdated = false;
export const completePasswordRecovery = async (password: string) => {
  const auth = createClient().auth;
  if (!passwordUpdated) {
    const { error } = await auth.updateUser({ password });
    if (error) throw new Error(error.message);
    passwordUpdated = true;
  }
  // A failed sign-out is retryable without updating the password again.
  const { error } = await auth.signOut({ scope: "local" });
  if (error)
    throw new Error(
      "La contraseña se actualizó, pero no se pudo cerrar la sesión. Reintentá para finalizar.",
    );
  verification = undefined;
  passwordUpdated = false;
};
