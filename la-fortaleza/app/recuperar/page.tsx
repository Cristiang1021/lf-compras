"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Panel";

export default function RecuperarPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "No se pudo enviar el correo");
      }
      setOk(json.data.notice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div className="modal-card">
        <p className="logo-pill" style={{ marginBottom: 6 }}>
          La Fortaleza
        </p>
        <h1 className="heading-lg" style={{ marginBottom: 6 }}>
          Recuperar contraseña
        </h1>
        <p className="body-sm" style={{ marginTop: 0, marginBottom: 20 }}>
          Escribe tu usuario o correo. Si está registrado y tiene email, te
          enviamos un enlace.
        </p>
        {error && <Alert kind="error">{error}</Alert>}
        {ok && <Alert kind="ok">{ok}</Alert>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="field-label">Usuario o correo</label>
            <input
              className="input"
              required
              minLength={3}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={busy}
          >
            {busy ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
        <p className="body-sm" style={{ marginTop: 16, marginBottom: 0 }}>
          <Link href="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
