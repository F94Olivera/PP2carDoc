export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:54321/functions/v1/api";
// Keep Edge execution close to Postgres to avoid repeated cross-region database calls.
export const fetchApi = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("x-region", "us-west-2");

  return fetch(`${apiUrl}${path}`, { ...init, headers });
};
