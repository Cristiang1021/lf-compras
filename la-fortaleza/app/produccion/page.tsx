"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, downloadExport } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { ProductPicker, type Product } from "@/components/forms/ProductPicker";
import { useConfirmSubmit } from "@/components/forms/ConfirmSave";

type Bodega = { id: string; nombre: string };
type LineaDraft = {
  key: string;
  productId: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: string;
  fechaProduccion: string;
  detalleProduccion: string;
  origenBodegaId: string;
  destinoBodegaId: string;
  observaciones: string;
};
type Linea = {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: number | null;
  fechaProduccion: string | null;
  detalleProduccion: string | null;
  origenBodegaId: string | null;
  destinoBodegaId: string | null;
  observaciones: string | null;
};
type Doc = {
  id: string;
  titulo: string | null;
  notas: string | null;
  locked: boolean;
  createdAt: string;
  totalLineas: number;
  lineas: Linea[];
};

function emptyLinea(p?: Product | null): LineaDraft {
  return {
    key: crypto.randomUUID(),
    productId: p?.id || "",
    codigo: p?.codigo || "",
    producto: p?.producto || "",
    unidadMedida: p?.unidadMedida || "",
    cantidad: "",
    fechaProduccion: "",
    detalleProduccion: "",
    origenBodegaId: "",
    destinoBodegaId: "",
    observaciones: "",
  };
}

export default function ProduccionPage() {
  const { user, loading, can, fieldOk } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [lineas, setLineas] = useState<LineaDraft[]>([]);
  const [showExtra, setShowExtra] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [draft, setDraft] = useState<LineaDraft>(emptyLinea());
  const [activo, setActivo] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function bodegaNombre(id: string | null | undefined) {
    if (!id) return "—";
    return bodegas.find((b) => b.id === id)?.nombre || "—";
  }

  async function load() {
    const [d, b] = await Promise.all([
      api<Doc[]>("/api/produccion"),
      api<Bodega[]>("/api/bodegas"),
    ]);
    setDocs(d);
    setBodegas(b);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load().catch((e) => setError(e.message));
  }, [user]);

  useEffect(() => {
    if (!product) return;
    setDraft((d) => ({
      ...d,
      productId: product.id,
      codigo: product.codigo,
      producto: product.producto,
      unidadMedida: product.unidadMedida,
    }));
  }, [product]);

  function addLinea() {
    if (!draft.productId) {
      setError("Elige un producto antes de agregarlo.");
      return;
    }
    setError(null);
    setLineas((prev) => [...prev, { ...draft, key: crypto.randomUUID() }]);
    setProduct(null);
    setDraft(emptyLinea());
  }

  const save = useConfirmSubmit(async () => {
    if (lineas.length === 0) throw new Error("Agrega al menos un producto");
    await api("/api/produccion", {
      method: "POST",
      body: JSON.stringify({
        titulo: titulo || null,
        notas: notas || null,
        confirm: true,
        lineas: lineas.map((l) => ({
          productId: l.productId,
          cantidad: l.cantidad === "" ? null : Number(l.cantidad),
          fechaProduccion: l.fechaProduccion || null,
          detalleProduccion: l.detalleProduccion || null,
          origenBodegaId: l.origenBodegaId || null,
          destinoBodegaId: l.destinoBodegaId || null,
          observaciones: l.observaciones || null,
        })),
      }),
    });
    setOk("Producción guardada.");
    setLineas([]);
    setTitulo("");
    setNotas("");
    setShowExtra(false);
    await load();
  });

  if (loading || !user) return null;

  return (
    <>
      {save.Modal}
      <div className="hero-panel">
        <div className="display-mark">Producción</div>
        <p>Anota lo que se prepara o transforma en cocina, con origen y destino.</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      {save.error && <Alert kind="error">{save.error}</Alert>}

      {can("produccion", "canCreate") && (
        <Panel title="Nueva producción">
          <button
            type="button"
            className="btn btn-tertiary"
            style={{ marginBottom: 10 }}
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? "Ocultar título y notas" : "Añadir título y notas"}
          </button>
          {showExtra && (
            <>
              <div className="field">
                <label className="field-label">Título</label>
                <input
                  className="input"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Notas</label>
                <textarea
                  className="textarea"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="table-wrap" style={{ marginBottom: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th>U.M.</th>
                  {fieldOk("produccion", "cantidad") && <th>Cantidad</th>}
                  {fieldOk("produccion", "fechaProduccion") && <th>Fecha</th>}
                  {fieldOk("produccion", "detalleProduccion") && (
                    <th>Detalle</th>
                  )}
                  {fieldOk("produccion", "origenBodegaId") && <th>Origen</th>}
                  {fieldOk("produccion", "destinoBodegaId") && <th>Destino</th>}
                  {fieldOk("produccion", "observaciones") && <th>Obs.</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td>{l.producto}</td>
                    <td className="micro">{l.codigo}</td>
                    <td>{l.unidadMedida}</td>
                    {fieldOk("produccion", "cantidad") && (
                      <td>{l.cantidad || "—"}</td>
                    )}
                    {fieldOk("produccion", "fechaProduccion") && (
                      <td>{l.fechaProduccion || "—"}</td>
                    )}
                    {fieldOk("produccion", "detalleProduccion") && (
                      <td>{l.detalleProduccion || "—"}</td>
                    )}
                    {fieldOk("produccion", "origenBodegaId") && (
                      <td>{bodegaNombre(l.origenBodegaId)}</td>
                    )}
                    {fieldOk("produccion", "destinoBodegaId") && (
                      <td>{bodegaNombre(l.destinoBodegaId)}</td>
                    )}
                    {fieldOk("produccion", "observaciones") && (
                      <td>{l.observaciones || "—"}</td>
                    )}
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setLineas((prev) =>
                            prev.filter((x) => x.key !== l.key),
                          )
                        }
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3}>
                    <ProductPicker
                      value={product?.id || ""}
                      onChange={setProduct}
                    />
                  </td>
                  {fieldOk("produccion", "cantidad") && (
                    <td>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step="any"
                        value={draft.cantidad}
                        onChange={(e) =>
                          setDraft({ ...draft, cantidad: e.target.value })
                        }
                      />
                    </td>
                  )}
                  {fieldOk("produccion", "fechaProduccion") && (
                    <td>
                      <input
                        className="input"
                        type="date"
                        value={draft.fechaProduccion}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            fechaProduccion: e.target.value,
                          })
                        }
                      />
                    </td>
                  )}
                  {fieldOk("produccion", "detalleProduccion") && (
                    <td>
                      <input
                        className="input"
                        value={draft.detalleProduccion}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            detalleProduccion: e.target.value,
                          })
                        }
                      />
                    </td>
                  )}
                  {fieldOk("produccion", "origenBodegaId") && (
                    <td>
                      <select
                        className="select"
                        value={draft.origenBodegaId}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            origenBodegaId: e.target.value,
                          })
                        }
                      >
                        <option value="">—</option>
                        {bodegas.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {fieldOk("produccion", "destinoBodegaId") && (
                    <td>
                      <select
                        className="select"
                        value={draft.destinoBodegaId}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            destinoBodegaId: e.target.value,
                          })
                        }
                      >
                        <option value="">—</option>
                        {bodegas.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {fieldOk("produccion", "observaciones") && (
                    <td>
                      <input
                        className="input"
                        value={draft.observaciones}
                        onChange={(e) =>
                          setDraft({ ...draft, observaciones: e.target.value })
                        }
                      />
                    </td>
                  )}
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addLinea}
                    >
                      Agregar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {lineas.length > 0 && (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                save.requestConfirm();
              }}
            >
              <button type="submit" className="btn btn-primary">
                Guardar producción
              </button>
            </form>
          )}
        </Panel>
      )}

      <Panel title="Historial">
        {can("produccion", "canExport") && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginBottom: 8 }}
            onClick={() =>
              void downloadExport("/api/produccion/export", "produccion.xlsx").catch(
                (e) => setError(e.message),
              )
            }
          >
            Descargar Excel
          </button>
        )}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Registro</th>
                <th>Fecha</th>
                <th>Productos</th>
                <th>Movimiento</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, idx) => {
                const primera = d.lineas[0];
                const movimiento = primera
                  ? `${bodegaNombre(primera.origenBodegaId)} → ${bodegaNombre(primera.destinoBodegaId)}`
                  : "—";
                return (
                  <tr key={d.id}>
                    <td>
                      Producción #{docs.length - idx}
                      {d.titulo ? ` — ${d.titulo}` : ""}
                    </td>
                    <td className="micro">{d.createdAt}</td>
                    <td>
                      {d.totalLineas}
                      <div className="micro muted">
                        {d.lineas
                          .slice(0, 2)
                          .map((l) => l.producto)
                          .join(", ")}
                        {d.lineas.length > 2 ? "…" : ""}
                      </div>
                    </td>
                    <td className="micro">{movimiento}</td>
                    <td>
                      {d.locked ? (
                        <span className="badge-locked">Guardado</span>
                      ) : (
                        <span className="badge-amber">Abierto</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setActivo(d)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {activo && (
        <div className="modal-scrim" role="dialog" aria-modal>
          <div className="modal-card" style={{ width: "min(100%, 960px)" }}>
            <h2 className="heading-lg" style={{ marginBottom: 8 }}>
              Producción — {activo.titulo || "Detalle"}
            </h2>
            <p className="body-sm" style={{ marginTop: 0 }}>
              Registro del {activo.createdAt}
              {activo.notas ? ` · ${activo.notas}` : ""}
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>U.M.</th>
                    <th>Fecha</th>
                    <th>Detalle</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {activo.lineas.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.codigo}
                        <div className="micro">{l.producto}</div>
                      </td>
                      <td>{l.cantidad ?? "—"}</td>
                      <td>{l.unidadMedida}</td>
                      <td>{l.fechaProduccion || "—"}</td>
                      <td>{l.detalleProduccion || "—"}</td>
                      <td>{bodegaNombre(l.origenBodegaId)}</td>
                      <td>{bodegaNombre(l.destinoBodegaId)}</td>
                      <td>{l.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActivo(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
