"use client";

import { ACCESS_TOKEN_MAX_AGE_SECONDS, type ApiErrorResponse } from "@cardoc/types";

import { createClient } from "./supabase/client";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:54321/functions/v1/api";
// Keep Edge execution close to Postgres to avoid repeated cross-region database calls.
export const fetchApi = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("x-region", "us-west-2");

  return fetch(`${apiUrl}${path}`, { ...init, headers });
};

export const authenticatedHomePath = "/budget";
export const loginPath = "/login";

const authExpiredEventName = "cardoc:auth-expired";

export const getErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;

  return payload?.message ?? (payload as { error?: string } | null)?.error ?? fallback;
};

export const fetchAuthenticatedUser = async () => {
  const { data, error } = await createClient().auth.getUser();

  if (error || !data.user) return null;
  return data.user;
};

export const notifyAuthExpired = () => {
  window.dispatchEvent(new Event(authExpiredEventName));
};

export const handleUnauthorizedResponse = (response: Response) => {
  if (response.status !== 401) {
    return false;
  }

  notifyAuthExpired();
  return true;
};

export const onAuthExpired = (handler: () => void) => {
  window.addEventListener(authExpiredEventName, handler);

  return () => window.removeEventListener(authExpiredEventName, handler);
};

export const fetchAuthenticated = async (path: string, init?: RequestInit) => {
  const client = createClient();
  let { data, error } = await client.auth.getSession();
  if (data.session) {
    // This decode only schedules renewal. The backend verifies identity and permissions.
    try {
      const payload = data.session.access_token
        .split(".")[1]!
        .replaceAll("-", "+")
        .replaceAll("_", "/");
      const { iat } = JSON.parse(atob(payload)) as { iat?: number };
      if (
        typeof iat !== "number" ||
        Date.now() >= (iat + ACCESS_TOKEN_MAX_AGE_SECONDS - 30) * 1000
      ) {
        ({ data, error } = await client.auth.refreshSession());
      }
    } catch {
      ({ data, error } = await client.auth.refreshSession());
    }
  }
  if (error || !data.session) {
    notifyAuthExpired();
    throw new Error("Authentication required.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  headers.set("Accept", "application/json");

  return fetchApi(path, {
    ...init,
    headers,
    credentials: "omit",
    cache: "no-store",
  });
};
