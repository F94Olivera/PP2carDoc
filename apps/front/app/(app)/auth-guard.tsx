"use client";

import { createClient } from "../lib/supabase/client";
import type { AuthUserResponse } from "@cardoc/types";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  fetchAuthenticatedUser,
  homePathForUser,
  loginPath,
  onAuthExpired,
} from "../lib/auth-client";

const UserContext = createContext<AuthUserResponse | null>(null);
export const useVerifiedUser = () => useContext(UserContext);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const pathname = usePathname();

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

        const isCustomerRoute = pathname === "/myvehicles" || pathname.startsWith("/myvehicles/");
        if ((user.role === "USER") !== isCustomerRoute) {
          router.replace(homePathForUser(user));
          return;
        }
        setUser(user);
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
  }, [router, pathname]);

  if (
    !user ||
    (user.role === "USER") !== (pathname === "/myvehicles" || pathname.startsWith("/myvehicles/"))
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700 dark:border-slate-700 dark:border-t-blue-300" />
      </main>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
