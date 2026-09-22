"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useAuth, type Role } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { roleLabel, fieldLabel } from "@/lib/client/labels";

const MODULE_LABELS: Record<string, string> = {
  productos: "Productos",
  compra_recepcion: "Compra vs recepción",
  transferencias: "Transferencias",
  produccion: "Producción",
  bodegas: "Bodegas",
  usuarios: "Usuarios",
  permisos: "Permisos",
};

type PermRow = {
  id: string;
  role: Role;
  module: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  fieldAccess: Record<string, boolean>;
};

type Payload = {
  roles: Role[];
  modules: string[];
  permissions: PermRow[];
  fieldKeysHint: Record<string, string[]>;
};

const FLAGS = [
  "canRead",
  "canCreate",
  "canUpdate",
  "canDelete",
  "canExport",
] as const;

export default function PermisosPage() {
  const { user, loading, can, refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [role, setRole] = useState<Role>("BODEGA");
  const [module, setModule] = useState("compra_recepcion");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermRow | null>(null);

  async function load() {
    const payload = await api<Payload>("/api/admin/permisos");
    setData(payload);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && can("permisos", "canRead")) {
      void load().catch((e) => setError(e.message));
    }
  }, [user, can]);

  useEffect(() => {
    if (!data) return;
    const row =
      data.permissions.find((p) => p.role === role && p.module === module) ||
      null;
    setDraft(
      row
        ? { ...row, fieldAccess: { ...(row.fieldAccess || {}) } }
        : {
            id: "",
            role,
            module,
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canExport: false,
            fieldAccess: {},
          },
    );
  }, [data, role, module]);

  async function save() {
    if (!draft || role === "SUPER_USUARIO") {
      setError("El super usuario siempre tiene acceso total (no editable).");
      return;
    }
    setError(null);
    setOk(null);
    try {
      await api("/api/admin/permisos", {
        method: "PUT",
        body: JSON.stringify({
          permissions: [
            {
              role: draft.role,
              module: draft.module,
              canRead: draft.canRead,
              canCreate: draft.canCreate,
              canUpdate: draft.canUpdate,
              canDelete: draft.canDelete,
              canExport: draft.canExport,
              fieldAccess: draft.fieldAccess,
            },
          ],
        }),
      });
      setOk("Permisos actualizados.");
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  if (loading || !user) return null;
  if (!can("permisos", "canRead")) {
    return <Alert kind="error">Sin permiso para editar permisos.</Alert>;
  }

  const fields = data?.fieldKeysHint[module] || [];

  return (
    <>
      <div className="hero-panel" style={{ minHeight: 80 }}>
        <div className="display-mark" style={{ fontSize: 34 }}>
          Permisos
        </div>
        <p>Define qué puede ver o registrar cada tipo de usuario.</p>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <Panel title="Editor de permisos">
        <div className="grid-2">
          <div className="field">
            <label className="field-label">Rol</label>
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(data?.roles || []).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Módulo</label>
            <select
              className="select"
              value={module}
              onChange={(e) => setModule(e.target.value)}
            >
              {(data?.modules || []).map((m) => (
                <option key={m} value={m}>
                  {MODULE_LABELS[m] || m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {draft && (
          <>
            <div className="row" style={{ marginBottom: 12 }}>
              {FLAGS.map((flag) => {
                const labels: Record<(typeof FLAGS)[number], string> = {
                  canRead: "Ver",
                  canCreate: "Crear",
                  canUpdate: "Editar",
                  canDelete: "Eliminar",
                  canExport: "Exportar",
                };
                return (
                <label key={flag} className="row" style={{ gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={draft[flag]}
                    disabled={role === "SUPER_USUARIO" || !can("permisos", "canUpdate")}
                    onChange={(e) =>
                      setDraft({ ...draft, [flag]: e.target.checked })
                    }
                  />
                  <span className="ui-label">{labels[flag]}</span>
                </label>
              );})}
            </div>

            {fields.length > 0 && (
              <>
                <div className="ui-label" style={{ marginBottom: 6 }}>
                  Campos que puede completar
                </div>
                <div className="stack">
                  {fields.map((f) => {
                    const keys = Object.keys(draft.fieldAccess);
                    const unrestricted = keys.length === 0;
                    const checked = unrestricted || draft.fieldAccess[f] === true;
                    return (
                      <label key={f} className="news-row" style={{ marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          disabled={
                            role === "SUPER_USUARIO" || !can("permisos", "canUpdate")
                          }
                          checked={checked}
                          onChange={(e) => {
                            const next = { ...draft.fieldAccess };
                            if (unrestricted) {
                              for (const key of fields) next[key] = true;
                            }
                            next[f] = e.target.checked;
                            setDraft({ ...draft, fieldAccess: next });
                          }}
                        />
                        <span style={{ flex: 1 }}>{fieldLabel(f)}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="micro muted">
                  Si no marcas nada especial, puede completar todos los campos.
                  Si marcas algunos, solo esos quedarán habilitados.
                </p>
              </>
            )}

            {can("permisos", "canUpdate") && role !== "SUPER_USUARIO" && (
              <button type="button" className="btn btn-signal" onClick={() => void save()}>
                Guardar permisos
              </button>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
