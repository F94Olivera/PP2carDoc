"use client";

import type { ApiErrorResponse } from "@cardoc/types";

import { createClient } from "./supabase/client";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const authenticatedHomePath = "/budget";
export const loginPath = "/login";

const authExpiredEventName = "cardoc:auth-expired";

export const getErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;

  return payload?.message ?? fallback;
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
