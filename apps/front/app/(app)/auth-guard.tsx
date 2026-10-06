"use client";

import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuthenticatedUser, loginPath, onAuthExpired } from "../lib/auth-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let isActive = true;

    const redirectToLogin = () => {
      router.replace(loginPath);
    };

    const unsubscribe = onAuthExpired(redirectToLogin);
    const { data: subscription } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") redirectToLogin();
    });

    const verifySession = async () => {
      try {
        const user = await fetchAuthenticatedUser();

        if (!isActive) {
          return;
        }

        if (!user) {
          redirectToLogin();
          return;
        }

        setIsVerified(true);
      } catch {
        if (isActive) {
          redirectToLogin();
        }
      }
    };

    void verifySession();

    return () => {
      isActive = false;
      unsubscribe();
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  if (!isVerified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700 dark:border-slate-700 dark:border-t-blue-300" />
      </main>
    );
  }

  return children;
}
