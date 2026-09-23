"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";

type MailConfig = {
  id: string | null;
  name: string;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  encryption: "none" | "starttls" | "ssl";
  username: string;
  hasPassword: boolean;
  isActive: boolean;
  configured: boolean;
};

const EMPTY: MailConfig = {
  id: null,
  name: "",
  fromEmail: "",
  fromName: "La Fortaleza",
  smtpHost: "",
  smtpPort: 465,
  encryption: "ssl",
  username: "",
  hasPassword: false,
  isActive: true,
  configured: false,
};

export default function CorreoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [password, setPassword] = useState("");
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<MailConfig>("/api/admin/correo");
    setForm(data);
    setPassword("");
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "SUPER_USUARIO") {
      void load().catch((e) => setError(e.message));
    }
  }, [user]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const saved = await api<MailConfig>("/api/admin/correo", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          fromEmail: form.fromEmail,
          fromName: form.fromName,
          smtpHost: form.smtpHost,
          smtpPort: Number(form.smtpPort),
          encryption: form.encryption,
          username: form.username,
          password: password || undefined,
          isActive: true,
        }),
      });
      setForm(saved);
      setPassword("");
      setOk("Correo saliente guardado. Las invitaciones saldrán desde este servidor.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api("/api/admin/correo/probar", {
        method: "POST",
        body: JSON.stringify({ to: testTo.trim() }),
      });
      setOk(`Correo de prueba enviado a ${testTo.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la prueba");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;
  if (user.role !== "SUPER_USUARIO") {
    return <Alert kind="error">Solo el super usuario configura el correo saliente.</Alert>;
  }

  return (
    <>
      <div className="hero-panel" style={{ minHeight: 80 }}>
        <div className="display-mark" style={{ fontSize: 34 }}>
          Correo saliente
        </div>
        <p>
          Configura el servidor SMTP de la empresa. Las invitaciones se envían
          desde aquí, no desde Gmail personal.
        </p>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="grid-main">
        <Panel title="Servidor SMTP">
          <form onSubmit={onSave}>
            <div className="field">
              <label className="field-label">Nombre</label>
              <input
                className="input"
                required
                placeholder="Infofibratelecom"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Nombre visible</label>
              <input
                className="input"
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Correo remitente</label>
              <input
                className="input"
                type="email"
                required
                placeholder="info@fibratelecom.ec"
                value={form.fromEmail}
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Servidor SMTP</label>
              <input
                className="input"
                required
                placeholder="mail.fibratelecom.ec"
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="field-label">Puerto</label>
                <input
                  className="input"
                  type="number"
                  required
                  value={form.smtpPort}
                  onChange={(e) =>
                    setForm({ ...form, smtpPort: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label className="field-label">Cifrado</label>
                <select
                  className="select"
                  value={form.encryption}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      encryption: e.target.value as MailConfig["encryption"],
                    })
                  }
                >
                  <option value="ssl">SSL / TLS (465)</option>
                  <option value="starttls">STARTTLS (587)</option>
                  <option value="none">Ninguno</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Usuario</label>
              <input
                className="input"
                required
                placeholder="info@fibratelecom.ec"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Contraseña</label>
              <input
                className="input"
                type="password"
                placeholder={
                  form.hasPassword
                    ? "••••••••  (deja vacío para no cambiarla)"
                    : "Contraseña SMTP"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar saliente"}
            </button>
          </form>
        </Panel>

        <Panel title="Probar envío">
          <p className="body-sm" style={{ marginTop: 0 }}>
            Envía un correo de prueba con el servidor guardado.
          </p>
          <div className="field">
            <label className="field-label">Enviar a</label>
            <input
              className="input"
              type="email"
              placeholder="tu@correo.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !testTo.trim()}
            onClick={() => void onTest()}
          >
            Enviar prueba
          </button>
        </Panel>
      </div>
    </>
  );
}
