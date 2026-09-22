"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useAuth, type Role } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { roleLabel } from "@/lib/client/labels";

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
};

const ROLES: Role[] = ["SUPER_USUARIO", "CONTABILIDAD", "CHEF", "BODEGA"];

export default function UsuariosPage() {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "BODEGA" as Role,
  });

  async function load() {
    setRows(await api<UserRow[]>("/api/admin/usuarios"));
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && can("usuarios", "canRead")) {
      void load().catch((e) => setError(e.message));
    }
  }, [user, can]);

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

  return (
    <>
      <div className="hero-panel" style={{ minHeight: 80 }}>
        <div className="display-mark" style={{ fontSize: 34 }}>
          Usuarios
        </div>
        <p>Crea cuentas y activa o desactiva el acceso del personal.</p>
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
          <Panel title="Nuevo usuario">
            <form onSubmit={onCreate}>
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
                <label className="field-label">Nombre</label>
                <input
                  className="input"
                  required
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
              <button type="submit" className="btn btn-signal">
                Crear
              </button>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
