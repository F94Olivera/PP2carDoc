import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const fetchForBrowserClient: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 403 || init?.method !== "POST" || typeof input !== "string") {
    return response;
  }

  const url = new URL(input);
  if (
    url.origin !== new URL(supabaseUrl).origin ||
    url.pathname !== "/auth/v1/logout" ||
    url.searchParams.get("scope") !== "local"
  ) {
    return response;
  }

  const payload = await response
    .clone()
    .json()
    .catch(() => null);
  if (payload?.code === "session_not_found" || payload?.error_code === "session_not_found") {
    return new Response(null, { status: 204 });
  }

  // Auth JS suppresses 403 on signOut. Pass the error body through with a
  // status it propagates so an unrelated refusal still reaches the caller.
  return new Response(response.body, { status: 400, headers: response.headers });
};

export function createClient() {
  return createBrowserClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { fetch: fetchForBrowserClient },
  });
}
