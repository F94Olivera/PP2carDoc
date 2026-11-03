"use client";
import { useState } from "react";
import { PASSWORD_RECOVERY_MESSAGE } from "@cardoc/types";
import { requestPasswordRecovery } from "../../lib/password-recovery";
import RecoveryShell, { recoveryInputClass, recoveryButtonClass } from "../recovery-shell";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <RecoveryShell title="Recuperar contraseña">
      {sent ? (
        <p role="status">{PASSWORD_RECOVERY_MESSAGE}</p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await requestPasswordRecovery({ email: email.trim() });
              setSent(true);
            } catch {
              setError("No se pudo procesar la solicitud. Intentá nuevamente.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block" htmlFor="recovery-email">
            Email de la cuenta
            <input
              id="recovery-email"
              className={recoveryInputClass}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className={recoveryButtonClass} disabled={busy}>
            {busy ? "Enviando…" : "Solicitar enlace"}
          </button>
        </form>
      )}
    </RecoveryShell>
  );
}
