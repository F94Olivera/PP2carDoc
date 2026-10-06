"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";
import { authenticatedHomePath, fetchAuthenticatedUser } from "../../lib/auth-client";

import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;

    const redirectIfAuthenticated = async () => {
      try {
        const user = await fetchAuthenticatedUser();

        if (!isActive) {
          return;
        }

        if (user) {
          router.replace(authenticatedHomePath);
          return;
        }

        setIsCheckingSession(false);
      } catch {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    };

    void redirectIfAuthenticated();

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(
          error.code === "invalid_credentials" ? t.login.invalidCredentials : t.login.defaultError,
        );
        return;
      }

      router.refresh();
      router.replace(authenticatedHomePath);
    } catch {
      setError(t.login.connectionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700 dark:border-slate-700 dark:border-t-blue-300" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="hidden flex-1 flex-col justify-between bg-slate-950 p-12 text-white dark:bg-black lg:flex">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
            {t.common.brand}
          </p>
          <h1 className="mt-8 max-w-xl text-5xl font-semibold tracking-tight">
            {t.login.heroTitle}
          </h1>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-300">{t.login.heroSubtitle}</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700 lg:hidden">
            {t.common.brand}
          </p>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">{t.login.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t.login.intro}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400 lg:hidden">
            {t.login.mobileContext}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="email"
              >
                {t.login.emailLabel}
              </label>
              <input
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.login.emailPlaceholder}
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="password"
              >
                {t.login.passwordLabel}
              </label>
              <div className="relative mt-2">
                <input
                  autoComplete="current-password"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
                  id="password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  required
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={
                    isPasswordVisible ? t.login.hidePasswordLabel : t.login.showPasswordLabel
                  }
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:text-slate-400 dark:hover:text-slate-100 dark:focus:ring-blue-950"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  type="button"
                >
                  {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <button
              className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t.login.submitting : t.login.submit}
            </button>
          </form>

          <div className="mt-10 flex justify-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              {t.login.creditPrefix}
              <svg
                aria-label={t.login.creditIconLabel}
                className="h-3.5 w-3.5 fill-rose-500"
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 21s-6.7-4.25-9.45-8.34C.65 9.83.99 6.2 3.46 4.39 5.5 2.9 8.38 3.25 10.2 5.08L12 6.88l1.8-1.8c1.82-1.83 4.7-2.18 6.74-.69 2.47 1.81 2.81 5.44.91 8.27C18.7 16.75 12 21 12 21Z" />
              </svg>
              {t.login.creditSuffix}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 12s3.25-6 9-6 9 6 9 6-3.25 6-9 6-9-6-9-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="m4 4 16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M9.5 5.4A8.5 8.5 0 0 1 12 5c5.75 0 9 7 9 7a16.8 16.8 0 0 1-3.1 4.05M14.1 14.25A2.5 2.5 0 0 1 9.75 9.9M6.45 7.15A16.2 16.2 0 0 0 3 12s3.25 7 9 7a8.7 8.7 0 0 0 3.35-.68"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
