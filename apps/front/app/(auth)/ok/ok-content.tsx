"use client";

import type { User } from "@supabase/supabase-js";
import { fetchAuthenticatedUser } from "../../lib/auth-client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";

type OkContentProps = {
  usuario?: string;
};

type AuthState =
  | {
      status: "loading";
    }
  | {
      status: "authenticated";
      user: User;
    }
  | {
      status: "unauthenticated";
      message: string;
    };

const toDisplayName = (usuario: string) => {
  const localPart = usuario.split("@")[0] ?? usuario;
  const normalized = localPart.replace(/[._-]+/g, " ").trim();

  if (!normalized) {
    return usuario;
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export function OkContent({ usuario }: OkContentProps) {
  const { t } = useI18n();
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      try {
        const user = await fetchAuthenticatedUser();
        if (isActive) {
          setAuthState(
            user
              ? { status: "authenticated", user }
              : { status: "unauthenticated", message: t.ok.defaultError },
          );
        }
      } catch {
        if (isActive) {
          setAuthState({ message: t.ok.connectionError, status: "unauthenticated" });
        }
      }
    };

    void loadSession();

    return () => {
      isActive = false;
    };
  }, [t.ok.connectionError, t.ok.defaultError]);

  const displayUser =
    authState.status === "authenticated"
      ? (authState.user.email ?? t.ok.fallbackUser)
      : (usuario ?? t.ok.fallbackUser);
  const nombre = toDisplayName(displayUser);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
          {authState.status === "loading" ? t.ok.loadingStatus : t.ok.status}
        </p>
        {authState.status === "authenticated" ? (
          <>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.ok.greeting(nombre)}</h1>
            <dl className="mt-6 space-y-3 rounded-lg bg-slate-50 px-4 py-4 text-left text-sm dark:bg-slate-950">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{t.ok.userLabel}</dt>
                <dd className="break-all font-semibold">{displayUser}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{t.ok.sessionLabel}</dt>
                <dd className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {t.ok.sessionActive}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
        {authState.status === "loading" ? (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">{t.ok.loadingMessage}</p>
        ) : null}
        {authState.status === "unauthenticated" ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {authState.message}
          </p>
        ) : null}
        <Link
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
          href={authState.status === "authenticated" ? "/budget" : "/login"}
        >
          {authState.status === "authenticated" ? t.ok.goToBudget : t.ok.backToLogin}
        </Link>
      </section>
    </main>
  );
}
