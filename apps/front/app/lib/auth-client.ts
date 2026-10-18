"use client";

import { ACCESS_TOKEN_MAX_AGE_SECONDS, type ApiErrorResponse } from "@cardoc/types";

import { createClient } from "./supabase/client";

import { fetchApi } from "./api-client";

export { apiUrl, fetchApi } from "./api-client";

export const authenticatedHomePath = "/budget";
export const loginPath = "/login";

const authExpiredEventName = "cardoc:auth-expired";

export const getErrorMessage = async (response: Response, fallback: string) => {
  const payload: Partial<ApiErrorResponse> | null = await response.json().catch(() => null);

  return typeof payload?.error === "string" && payload.error.trim() ? payload.error : fallback;
};

export const fetchAuthenticatedUser = async () => {
  const { data, error } = await createClient().auth.getUser();

  if (error || !data.user) return null;
  return data.user;
};

export const notifyAuthExpired = () => {
  window.dispatchEvent(new Event(authExpiredEventName));
};

const expiredResponses = new WeakSet<Response>();

export const handleUnauthorizedResponse = (response: Response) => {
  if (response.status !== 401) {
    return false;
  }

  if (!expiredResponses.has(response)) {
    expiredResponses.add(response);
    notifyAuthExpired();
  }
  return true;
};

export const onAuthExpired = (handler: () => void) => {
  window.addEventListener(authExpiredEventName, handler);

  return () => window.removeEventListener(authExpiredEventName, handler);
};

const readApiSession = async () => {
  const client = createClient();
  let { data, error } = await client.auth.getSession();
  if (data.session) {
    // This decode only schedules renewal. The backend verifies identity and permissions.
    let needsRefresh = true;
    try {
      const payload = data.session.access_token
        .split(".")[1]!
        .replaceAll("-", "+")
        .replaceAll("_", "/");
      const { iat } = JSON.parse(atob(payload)) as { iat?: number };
      needsRefresh =
        typeof iat !== "number" ||
        !Number.isFinite(iat) ||
        iat * 1000 > Date.now() ||
        Date.now() >= (iat + ACCESS_TOKEN_MAX_AGE_SECONDS - 30) * 1000;
    } catch {
      // A malformed local token must be renewed, never used to authorize a request.
      needsRefresh = true;
    }
    if (needsRefresh) ({ data, error } = await client.auth.refreshSession());
  }
  if (error || !data.session) {
    notifyAuthExpired();
    throw new Error("Authentication required.");
  }

  return data.session;
};

// Share renewal across concurrent API requests in this browser context.
let pendingSession: ReturnType<typeof readApiSession> | undefined;

export const fetchAuthenticated = async (path: string, init?: RequestInit) => {
  pendingSession ??= readApiSession().finally(() => {
    pendingSession = undefined;
  });
  const session = await pendingSession;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetchApi(path, {
    ...init,
    headers,
    credentials: "omit",
    cache: "no-store",
  });
  handleUnauthorizedResponse(response);
  return response;
};

export const signOut = async () => {
  const response = await fetchAuthenticated("/logout", { method: "POST" });
  if (!response.ok && response.status !== 401) {
    throw new Error(await getErrorMessage(response, "Could not sign out."));
  }
  // The SDK removes SSR cookies and local tokens, including an already revoked session.
  const { error } = await createClient().auth.signOut({ scope: "local" });
  if (error) throw error;
};
