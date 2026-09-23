"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, downloadExport } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { UmMark } from "@/components/ui/UmMark";
import { useConfirmSubmit } from "@/components/forms/ConfirmSave";

type Product = {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  isActive: boolean;
};

type PageResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function ProductosPage() {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    codigo: "",
    producto: "",
    unidadMedida: "",
  });

  async function load(nextPage = page, query = q) {
    const data = await api<PageResult>(
      `/api/productos?page=${nextPage}&pageSize=20&q=${encodeURIComponent(query.trim())}`,
    );
    setRows(Array.isArray(data.items) ? data.items : []);
    setPage(data.page || 1);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      void load(1, q).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, q]);

  const save = useConfirmSubmit(async () => {
    await api("/api/productos", {
      method: "POST",
      body: JSON.stringify({ ...form, confirm: true }),
    });
    setOk("Producto guardado.");
    setForm({ codigo: "", producto: "", unidadMedida: "" });
    await load(1, q);
  });

  if (loading || !user) return null;

  return (
    <>
      {save.Modal}
      <div className="hero-panel">
        <div className="display-mark">Productos</div>
        <p>
          Consulta el catálogo de insumos. Puedes buscar por nombre o código y
          descargar el listado en Excel.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      {save.error && <Alert kind="error">{save.error}</Alert>}

      <div className="grid-main">
        <Panel title="Listado">
          <div className="row" style={{ marginBottom: 8 }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 160 }}
              placeholder="Buscar por código o nombre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {can("productos", "canExport") && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  void downloadExport(
                    "/api/productos/export",
                    "maestro-productos.xlsx",
                  ).catch((e) => setError(e.message))
                }
              >
                Descargar Excel
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>U.M.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.codigo}</td>
                    <td>{r.producto}</td>
                    <td>
                      <UmMark value={r.unidadMedida} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <span className="micro">
              {total} productos · página {page} de {totalPages}
            </span>
            <div className="row">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => void load(page - 1).catch((e) => setError(e.message))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => void load(page + 1).catch((e) => setError(e.message))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </Panel>

        {can("productos", "canCreate") && (
          <Panel title="Alta de producto">
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                save.requestConfirm();
              }}
            >
              <div className="field">
                <label className="field-label">Código</label>
                <input
                  className="input"
                  required
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Producto</label>
                <input
                  className="input"
                  required
                  value={form.producto}
                  onChange={(e) => setForm({ ...form, producto: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Unidad de medida</label>
                <input
                  className="input"
                  required
                  value={form.unidadMedida}
                  onChange={(e) =>
                    setForm({ ...form, unidadMedida: e.target.value })
                  }
                />
              </div>
              <Alert kind="warn">
                Al confirmar, el alta queda registrada. Ediciones posteriores
                solo con permiso (super usuario).
              </Alert>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
