import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import { AuthGuard } from "./auth-guard";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");

  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
