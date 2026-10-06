"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "../language-toggle";
import { ThemeToggle } from "../theme-toggle";
import { useI18n } from "../i18n/use-i18n";

const toggleClassName =
  "flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 px-2 text-xs font-semibold uppercase text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800";

const iconToggleClassName =
  "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(false);
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) {
        setSignOutError(true);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError(true);
    } finally {
      setIsSigningOut(false);
    }
  };
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navItems = [
    {
      href: "/budget",
      icon: DocumentIcon,
      label: t.budget.navBudget,
    },
    {
      href: "/customers",
      icon: UsersIcon,
      label: t.budget.navCustomers,
    },
    {
      href: "/vehicles",
      icon: CarIcon,
      label: t.budget.navVehicles,
    },
    {
      href: "/work-orders",
      icon: WrenchIcon,
      label: t.budget.navWorkOrders,
    },
    {
      href: "/finances",
      icon: ChartIcon,
      label: t.budget.navFinances,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 md:flex md:min-h-screen md:w-72 md:flex-col md:border-b-0 md:border-r md:px-5 md:pb-12 md:pt-6">
          <div className="flex items-center justify-between gap-3 md:block">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
                {t.common.brand}
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight md:mt-4 md:text-xl">
                {t.budget.workshop}
              </h1>
            </div>
            <button
              aria-expanded={isMobileNavOpen}
              aria-label={isMobileNavOpen ? t.budget.closeNavigation : t.budget.openNavigation}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 md:hidden"
              onClick={() => setIsMobileNavOpen((currentValue) => !currentValue)}
              type="button"
            >
              <MenuIcon />
            </button>
          </div>

          <nav
            className={`mt-4 gap-2 overflow-x-auto md:mt-8 md:flex md:flex-col md:overflow-visible ${
              isMobileNavOpen ? "flex" : "hidden"
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/budget" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  className={`inline-flex h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition md:w-full ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  href={item.href}
                  key={item.label}
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}

            <div className="flex h-11 items-center gap-2 md:hidden">
              <LanguageToggle className={toggleClassName} />
              <ThemeToggle className={iconToggleClassName} />
            </div>
          </nav>

          <CreditFooter
            className={`mt-3 justify-center ${isMobileNavOpen ? "flex" : "hidden"} md:hidden`}
          />

          <div className="mt-8 hidden items-center gap-2 md:flex">
            <LanguageToggle className={toggleClassName} />
            <ThemeToggle className={iconToggleClassName} />
          </div>

          <button
            className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            {isSigningOut ? t.login.signingOut : t.login.signOut}
          </button>
          {signOutError ? (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {t.login.signOutError}
            </p>
          ) : null}

          <div className="mt-auto hidden pb-2 md:block">
            <CreditFooter className="flex justify-center" />
          </div>
        </aside>

        <section className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</section>
      </div>
    </main>
  );
}

function CreditFooter({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <p
      className={`items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400 ${
        className ?? ""
      }`}
    >
      {t.login.creditPrefix}
      <HeartIcon />
      {t.login.creditSuffix}
    </p>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 fill-rose-500"
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 21s-6.7-4.25-9.45-8.34C.65 9.83.99 6.2 3.46 4.39 5.5 2.9 8.38 3.25 10.2 5.08L12 6.88l1.8-1.8c1.82-1.83 4.7-2.18 6.74-.69 2.47 1.81 2.81 5.44.91 8.27C18.7 16.75 12 21 12 21Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3.5h6.5L18 8v12.5H7V3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M13.5 3.5V8H18M9.5 12h6M9.5 15h6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3.5 20a6 6 0 0 1 12 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M16 11.5a3 3 0 0 0 0-6M17.5 14.5A5 5 0 0 1 20.5 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12.5 6.8 7h10.4l1.8 5.5M4 12.5h16v5H4v-5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 17.5v2M17.5 17.5v2M7.5 15h.01M16.5 15h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m14.5 5 4.5 4.5-8.8 8.8a3.2 3.2 0 0 1-4.5 0 3.2 3.2 0 0 1 0-4.5L14.5 5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m13 6.5 4.5 4.5M6.8 17.2l-2.3 2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 19.5h16M7 16v-5M12 16V6M17 16V9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
