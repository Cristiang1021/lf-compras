"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useAuth, type Role } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { roleLabel } from "@/lib/client/labels";

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
};

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
  status: "pendiente" | "aceptada" | "cancelada";
  expiresAt: string;
  createdAt: string;
};

const ROLES: Role[] = ["SUPER_USUARIO", "CONTABILIDAD", "CHEF", "BODEGA"];

export default function UsuariosPage() {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState({
    email: "",
    fullName: "",
    role: "BODEGA" as Role,
  });
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "BODEGA" as Role,
  });
  const [showManual, setShowManual] = useState(false);

  async function load() {
    const [users, pending] = await Promise.all([
      api<UserRow[]>("/api/admin/usuarios"),
      api<InviteRow[]>("/api/admin/invitaciones"),
    ]);
    setRows(users);
    setInvites(pending);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && can("usuarios", "canRead")) {
      void load().catch((e) => setError(e.message));
    }
  }, [user, can]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api<{ notice?: string }>("/api/admin/invitaciones", {
        method: "POST",
        body: JSON.stringify({
          email: invite.email.trim(),
          fullName: invite.fullName.trim() || null,
          role: invite.role,
        }),
      });
      setOk(data.notice || "Invitación enviada.");
      setInvite({ email: "", fullName: "", role: "BODEGA" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      await api("/api/admin/usuarios", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setOk("Usuario creado.");
      setForm({ username: "", password: "", fullName: "", role: "BODEGA" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function toggleActive(row: UserRow) {
    try {
      await api(`/api/admin/usuarios/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  if (loading || !user) return null;
  if (!can("usuarios", "canRead")) {
    return <Alert kind="error">Sin permiso para usuarios.</Alert>;
  }

  const pendientes = invites.filter((i) => i.status === "pendiente");

  return (
    <>
      <div className="hero-panel" style={{ minHeight: 80 }}>
        <div className="display-mark" style={{ fontSize: 34 }}>
          Usuarios
        </div>
        <p>
          Invita al personal por correo. Elige rol y correo; el saliente se
          configura en{" "}
          {user.role === "SUPER_USUARIO" ? (
            <Link href="/admin/correo">Correo</Link>
          ) : (
            "Correo"
          )}
          .
        </p>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="grid-main">
        <Panel title="Directorio">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.username}</td>
                    <td>{r.fullName}</td>
                    <td className="micro">{r.email || "—"}</td>
                    <td className="micro">{roleLabel(r.role)}</td>
                    <td>
                      {r.isActive ? (
                        <span className="badge-amber">Activo</span>
                      ) : (
                        <span className="badge-locked">Inactivo</span>
                      )}
                    </td>
                    <td>
                      {can("usuarios", "canUpdate") && r.id !== user.id && (
                        <button
                          type="button"
                          className="btn btn-carbon"
                          onClick={() => void toggleActive(r)}
                        >
                          {r.isActive ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {can("usuarios", "canCreate") && (
          <Panel title="Invitar por correo">
            <form onSubmit={onInvite}>
              <div className="field">
                <label className="field-label">Correo</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={invite.email}
                  onChange={(e) =>
                    setInvite({ ...invite, email: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label className="field-label">Nombre (opcional)</label>
                <input
                  className="input"
                  value={invite.fullName}
                  onChange={(e) =>
                    setInvite({ ...invite, fullName: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label className="field-label">Rol</label>
                <select
                  className="select"
                  value={invite.role}
                  onChange={(e) =>
                    setInvite({ ...invite, role: e.target.value as Role })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-signal" disabled={busy}>
                {busy ? "Enviando…" : "Enviar invitación"}
              </button>
            </form>

            {pendientes.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="field-label" style={{ marginBottom: 8 }}>
                  Pendientes
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.map((i) => (
                        <tr key={i.id}>
                          <td>
                            {i.email}
                            {i.fullName ? (
                              <div className="micro">{i.fullName}</div>
                            ) : null}
                          </td>
                          <td className="micro">{roleLabel(i.role)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={busy}
                              onClick={() => {
                                setInvite({
                                  email: i.email,
                                  fullName: i.fullName || "",
                                  role: i.role,
                                });
                              }}
                            >
                              Reenviar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-tertiary"
              style={{ marginTop: 16 }}
              onClick={() => setShowManual((v) => !v)}
            >
              {showManual ? "Ocultar alta manual" : "Crear usuario sin correo"}
            </button>

            {showManual && (
              <form onSubmit={onCreate} style={{ marginTop: 14 }}>
                <div className="field">
                  <label className="field-label">Usuario</label>
                  <input
                    className="input"
                    required
                    minLength={3}
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="field-label">Nombre</label>
                  <input
                    className="input"
                    required
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="field-label">Rol</label>
                  <select
                    className="select"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as Role })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary">
                  Crear
                </button>
              </form>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
