"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Panel";
import { PasswordHints } from "@/components/forms/PasswordHints";
import { isStrongPassword } from "@/lib/password";

export default function NuevaContrasenaPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/recuperar/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Enlace no válido");
        }
        setUsername(json.data.username);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Enlace no válido"),
      );
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recuperar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "No se pudo actualizar");
      }
      setOk(json.data.notice);
      setTimeout(() => router.replace("/login"), 1200);
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
          Nueva contraseña
        </h1>
        <p className="body-sm" style={{ marginTop: 0, marginBottom: 20 }}>
          {username ? `Usuario: ${username}` : "Validando enlace…"}
        </p>
        {error && <Alert kind="error">{error}</Alert>}
        {ok && <Alert kind="ok">{ok}</Alert>}
        {username && !ok && (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label className="field-label">Nueva contraseña</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordHints password={password} />
            </div>
            <div className="field">
              <label className="field-label">Confirmar</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={
                busy || !isStrongPassword(password) || password !== confirm
              }
            >
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
