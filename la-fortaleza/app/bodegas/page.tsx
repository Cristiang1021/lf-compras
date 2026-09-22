"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";

type Bodega = { id: string; nombre: string; isActive: boolean };

export default function BodegasPage() {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Bodega[]>([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    setRows(await api<Bodega[]>("/api/bodegas"));
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load().catch((e) => setError(e.message));
  }, [user]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/bodegas", {
        method: "POST",
        body: JSON.stringify({ nombre }),
      });
      setNombre("");
      setOk("Bodega creada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  if (loading || !user) return null;

  return (
    <>
      <div className="hero-panel" style={{ minHeight: 80 }}>
        <div className="display-mark" style={{ fontSize: 34 }}>
          Bodegas
        </div>
        <p>Administra las ubicaciones de almacenamiento del restaurante.</p>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="grid-main">
        <Panel title="Listado">
          <div className="stack">
            {rows.map((b) => (
              <div key={b.id} className="news-row">
                <strong style={{ flex: 1 }}>{b.nombre}</strong>
                <span className="badge-amber">Activa</span>
              </div>
            ))}
          </div>
        </Panel>
        {can("bodegas", "canCreate") && (
          <Panel title="Nueva bodega">
            <form onSubmit={onCreate}>
              <div className="field">
                <label className="field-label">Nombre</label>
                <input
                  className="input"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
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
