"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, downloadExport } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { ProductPicker, type Product } from "@/components/forms/ProductPicker";
import { useConfirmSubmit } from "@/components/forms/ConfirmSave";

type LineaDraft = {
  key: string;
  productId: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: string;
  fechaPedido: string;
};

type LineaDoc = {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: number | null;
  fechaPedido: string | null;
  cantidadRecibida: number | null;
  proveedor: string | null;
  fechaRecepcion: string | null;
  facturaNotaVenta: string | null;
  observaciones: string | null;
};

type Doc = {
  id: string;
  titulo: string | null;
  notas: string | null;
  estado?: string | null;
  locked: boolean;
  createdAt: string;
  totalLineas: number;
  lineas: LineaDoc[];
};

export default function CompraPage() {
  const { user, loading, can, fieldOk } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [lineas, setLineas] = useState<LineaDraft[]>([]);
  const [cantidad, setCantidad] = useState("");
  const [fechaPedido, setFechaPedido] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [activo, setActivo] = useState<Doc | null>(null);
  const [recepcion, setRecepcion] = useState<
    Record<
      string,
      {
        cantidadRecibida: string;
        fechaRecepcion: string;
        facturaNotaVenta: string;
        observaciones: string;
        proveedor: string;
      }
    >
  >({});
  const [guardandoRecepcion, setGuardandoRecepcion] = useState(false);

  async function load() {
    setDocs(await api<Doc[]>("/api/compra-recepcion"));
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load().catch((e) => setError(e.message));
  }, [user]);

  function addLinea() {
    if (!product) {
      setError("Elige un producto.");
      return;
    }
    setError(null);
    setLineas((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        codigo: product.codigo,
        producto: product.producto,
        unidadMedida: product.unidadMedida,
        cantidad,
        fechaPedido,
      },
    ]);
    setProduct(null);
    setCantidad("");
    setFechaPedido("");
  }

  const save = useConfirmSubmit(async () => {
    if (lineas.length === 0) throw new Error("Agrega al menos un producto");
    await api("/api/compra-recepcion", {
      method: "POST",
      body: JSON.stringify({
        titulo: titulo || null,
        notas: notas || null,
        confirm: true,
        lineas: lineas.map((l) => ({
          productId: l.productId,
          cantidad: l.cantidad === "" ? null : Number(l.cantidad),
          fechaPedido: l.fechaPedido || null,
        })),
      }),
    });
    setOk("Compra guardada. Queda abierta para completar la recepción.");
    setLineas([]);
    setTitulo("");
    setNotas("");
    await load();
  });

  function openRecepcion(doc: Doc) {
    setActivo(doc);
    const map: typeof recepcion = {};
    for (const l of doc.lineas) {
      map[l.id] = {
        cantidadRecibida:
          l.cantidadRecibida === null || l.cantidadRecibida === undefined
            ? ""
            : String(l.cantidadRecibida),
        fechaRecepcion: l.fechaRecepcion || "",
        facturaNotaVenta: l.facturaNotaVenta || "",
        observaciones: l.observaciones || "",
        proveedor: l.proveedor || "",
      };
    }
    setRecepcion(map);
  }

  async function guardarRecepcion(cerrar: boolean) {
    if (!activo) return;
    setGuardandoRecepcion(true);
    setError(null);
    try {
      const data = await api<Doc & { notice?: string }>(
        `/api/compra-recepcion/${activo.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            cerrar,
            lineas: Object.entries(recepcion).map(([id, v]) => ({
              id,
              cantidadRecibida:
                v.cantidadRecibida === "" ? null : Number(v.cantidadRecibida),
              fechaRecepcion: v.fechaRecepcion || null,
              facturaNotaVenta: v.facturaNotaVenta || null,
              observaciones: v.observaciones || null,
              proveedor: v.proveedor || null,
            })),
          }),
        },
      );
      setOk(data.notice || "Recepción actualizada.");
      setActivo(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar recepción");
    } finally {
      setGuardandoRecepcion(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === docs.length) setSelectedIds([]);
    else setSelectedIds(docs.map((d) => d.id));
  }

  const exportUrl = useMemo(() => {
    if (selectedIds.length === 0) return "/api/compra-recepcion/export";
    return `/api/compra-recepcion/export?ids=${selectedIds.join(",")}`;
  }, [selectedIds]);

  if (loading || !user) return null;

  return (
    <>
      {save.Modal}
      <div className="hero-panel">
        <div className="display-mark">Compra vs recepción</div>
        <p>
          Primero se registra el pedido y después se completa lo recibido en
          bodega. Cada compra queda como un solo registro.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      {save.error && <Alert kind="error">{save.error}</Alert>}

      {can("compra_recepcion", "canCreate") && (
        <Panel title="Nueva compra">
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
                  {fieldOk("compra_recepcion", "cantidad") && <th>Cantidad</th>}
                  {fieldOk("compra_recepcion", "fechaPedido") && (
                    <th>Fecha pedido</th>
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td>{l.producto}</td>
                    <td>{l.codigo}</td>
                    <td>{l.unidadMedida}</td>
                    {fieldOk("compra_recepcion", "cantidad") && (
                      <td>{l.cantidad || "—"}</td>
                    )}
                    {fieldOk("compra_recepcion", "fechaPedido") && (
                      <td>{l.fechaPedido || "—"}</td>
                    )}
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setLineas((prev) => prev.filter((x) => x.key !== l.key))
                        }
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2}>
                    <ProductPicker
                      value={product?.id || ""}
                      onChange={setProduct}
                    />
                  </td>
                  <td>{product?.unidadMedida || "—"}</td>
                  {fieldOk("compra_recepcion", "cantidad") && (
                    <td>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step="any"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                      />
                    </td>
                  )}
                  {fieldOk("compra_recepcion", "fechaPedido") && (
                    <td>
                      <input
                        className="input"
                        type="date"
                        value={fechaPedido}
                        onChange={(e) => setFechaPedido(e.target.value)}
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
                Guardar compra ({lineas.length} línea
                {lineas.length === 1 ? "" : "s"})
              </button>
            </form>
          )}
        </Panel>
      )}

      <Panel title="Historial de compras">
        <div className="row" style={{ marginBottom: 10 }}>
          {can("compra_recepcion", "canExport") && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                void downloadExport(
                  exportUrl,
                  "compra-vs-recepcion.xlsx",
                ).catch((e) => setError(e.message))
              }
            >
              {selectedIds.length > 0
                ? `Descargar Excel (${selectedIds.length})`
                : "Descargar Excel"}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={toggleSelectAll}>
            {selectedIds.length === docs.length && docs.length > 0
              ? "Quitar selección"
              : "Seleccionar todos"}
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Registro</th>
                <th>Fecha</th>
                <th>Productos</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, idx) => {
                const estado = d.estado || (d.locked ? "CERRADO" : "PEDIDO");
                return (
                  <tr key={d.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => toggleSelect(d.id)}
                      />
                    </td>
                    <td>
                      Compra #{docs.length - idx}
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
                    <td>
                      {estado === "CERRADO" ? (
                        <span className="badge-locked">Cerrado</span>
                      ) : (
                        <span className="badge-amber">Pendiente recepción</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openRecepcion(d)}
                      >
                        {estado === "CERRADO" ? "Ver" : "Completar recepción"}
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
          <div className="modal-card" style={{ width: "min(100%, 820px)" }}>
            <h2 className="heading-lg" style={{ marginBottom: 8 }}>
              Recepción — {activo.titulo || "Compra"}
            </h2>
            <p className="body-sm" style={{ marginTop: 0 }}>
              Completa cantidad recibida, fecha, factura y observaciones por
              producto.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Pedida</th>
                    <th>Recibida</th>
                    <th>Fecha recepción</th>
                    <th>Factura</th>
                    <th>Proveedor</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {activo.lineas.map((l) => {
                    const r = recepcion[l.id] || {
                      cantidadRecibida: "",
                      fechaRecepcion: "",
                      facturaNotaVenta: "",
                      observaciones: "",
                      proveedor: "",
                    };
                    const cerrado =
                      activo.estado === "CERRADO" || activo.locked;
                    const soloLectura =
                      cerrado && user.role !== "SUPER_USUARIO";
                    return (
                      <tr key={l.id}>
                        <td>
                          {l.codigo}
                          <div className="micro">{l.producto}</div>
                        </td>
                        <td>{l.cantidad ?? "—"}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step="any"
                            disabled={
                              soloLectura ||
                              !fieldOk("compra_recepcion", "cantidadRecibida")
                            }
                            value={r.cantidadRecibida}
                            onChange={(e) =>
                              setRecepcion((prev) => ({
                                ...prev,
                                [l.id]: {
                                  ...r,
                                  cantidadRecibida: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="date"
                            disabled={
                              soloLectura ||
                              !fieldOk("compra_recepcion", "fechaRecepcion")
                            }
                            value={r.fechaRecepcion}
                            onChange={(e) =>
                              setRecepcion((prev) => ({
                                ...prev,
                                [l.id]: {
                                  ...r,
                                  fechaRecepcion: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            disabled={
                              soloLectura ||
                              !fieldOk("compra_recepcion", "facturaNotaVenta")
                            }
                            value={r.facturaNotaVenta}
                            onChange={(e) =>
                              setRecepcion((prev) => ({
                                ...prev,
                                [l.id]: {
                                  ...r,
                                  facturaNotaVenta: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            disabled={
                              soloLectura ||
                              !fieldOk("compra_recepcion", "proveedor")
                            }
                            value={r.proveedor}
                            onChange={(e) =>
                              setRecepcion((prev) => ({
                                ...prev,
                                [l.id]: { ...r, proveedor: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            disabled={
                              soloLectura ||
                              !fieldOk("compra_recepcion", "observaciones")
                            }
                            value={r.observaciones}
                            onChange={(e) =>
                              setRecepcion((prev) => ({
                                ...prev,
                                [l.id]: {
                                  ...r,
                                  observaciones: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
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
              {(activo.estado !== "CERRADO" || user.role === "SUPER_USUARIO") && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={guardandoRecepcion}
                    onClick={() => void guardarRecepcion(false)}
                  >
                    Guardar recepción
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={guardandoRecepcion}
                    onClick={() => void guardarRecepcion(true)}
                  >
                    Guardar y cerrar compra
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
