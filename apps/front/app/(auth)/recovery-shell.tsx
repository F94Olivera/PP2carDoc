import Link from "next/link";
export default function RecoveryShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="w-full max-w-sm space-y-6 py-12">
        <p className="text-sm font-semibold text-blue-600">carDoc</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {children}
        <Link className="block text-blue-600 underline" href="/login">
          Volver al login
        </Link>
      </section>
    </main>
  );
}
export const recoveryInputClass =
  "mt-2 h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-950 dark:bg-slate-900 dark:text-slate-50";
export const recoveryButtonClass =
  "h-11 w-full rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50";
