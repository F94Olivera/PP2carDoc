"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isValidPassword } from "@cardoc/types";
import { verifyRecoveryLink, completePasswordRecovery } from "../../lib/password-recovery";
import RecoveryShell, { recoveryInputClass, recoveryButtonClass } from "../recovery-shell";
export default function ResetPasswordPage() {
  const [state, setState] = useState<"validating" | "invalid" | "ready">("validating");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void verifyRecoveryLink().then((valid) => {
      if (active) setState(valid ? "ready" : "invalid");
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <RecoveryShell title="Restablecer contraseña">
      {state === "validating" && <p role="status">Validando enlace…</p>}
      {state === "invalid" && (
        <p role="alert">El enlace es inválido, ya fue usado o está vencido.</p>
      )}
      {state === "ready" && (
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setError("");
            if (!isValidPassword(password)) {
              setError(
                "La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes UTF-8.",
              );
              return;
            }
            if (password !== confirmation) {
              setError("Las contraseñas no coinciden.");
              return;
            }
            setBusy(true);
            try {
              await completePasswordRecovery(password);
              setPassword("");
              setConfirmation("");
              window.location.replace("/login?password_updated=1");
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "No se pudo actualizar. Intentá nuevamente.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>Mínimo 8 caracteres y máximo 72 bytes UTF-8.</p>
          <label className="block" htmlFor="new-password">
            Nueva contraseña
            <input
              id="new-password"
              className={recoveryInputClass}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block" htmlFor="confirm-password">
            Confirmar contraseña
            <input
              id="confirm-password"
              className={recoveryInputClass}
              type="password"
              autoComplete="new-password"
              required
              disabled={busy}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className={recoveryButtonClass} disabled={busy}>
            {busy ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </form>
      )}
      <Link className="block text-blue-600 underline" href="/forgot-password">
        Solicitar otro enlace
      </Link>
    </RecoveryShell>
  );
}
