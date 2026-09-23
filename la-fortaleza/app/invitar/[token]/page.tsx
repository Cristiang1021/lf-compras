"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Panel";

type InviteInfo = {
  email: string;
  role: string;
  roleLabel: string;
  fullName: string | null;
  expiresAt: string;
};

export default function AceptarInvitacionPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    password: "",
    confirm: "",
  });

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/invitar/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Invitación no válida");
        }
        const data = json.data as InviteInfo;
        setInfo(data);
        setForm((f) => ({
          ...f,
          fullName: data.fullName || "",
          username: data.email.split("@")[0] || "",
        }));
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Invitación no válida"),
      );
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "No se pudo crear la cuenta");
      }
      setOk(json.data.notice || "Cuenta creada.");
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
      <div className="modal-card" style={{ width: "min(100%, 440px)" }}>
        <p className="logo-pill" style={{ marginBottom: 6 }}>
          La Fortaleza
        </p>
        <h1 className="heading-lg" style={{ marginBottom: 6 }}>
          Unirte a la app
        </h1>
        <p className="body-sm" style={{ marginTop: 0, marginBottom: 20 }}>
          {info
            ? `Invitación para ${info.email} · rol ${info.roleLabel}`
            : "Validando invitación…"}
        </p>
        {error && <Alert kind="error">{error}</Alert>}
        {ok && <Alert kind="ok">{ok}</Alert>}
        {info && !ok && (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label className="field-label">Usuario</label>
              <input
                className="input"
                required
                minLength={3}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Nombre completo</label>
              <input
                className="input"
                required
                minLength={2}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Contraseña</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Confirmar contraseña</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={busy}
            >
              {busy ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
