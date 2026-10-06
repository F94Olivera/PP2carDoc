"use client";

import type { ApiErrorResponse } from "@cardoc/types";

import { createClient } from "./supabase/client";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:54321/functions/v1/api";
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
  const { data, error } = await createClient().auth.getSession();
  if (error || !data.session) {
    notifyAuthExpired();
    throw new Error("Authentication required.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  headers.set("Accept", "application/json");

  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "omit",
    cache: "no-store",
  });
};
