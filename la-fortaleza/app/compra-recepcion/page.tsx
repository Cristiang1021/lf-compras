"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, downloadExport } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { Alert, Panel } from "@/components/ui/Panel";
import { UmMark } from "@/components/ui/UmMark";
import { ProductPicker, type Product } from "@/components/forms/ProductPicker";
import { useConfirmSubmit } from "@/components/forms/ConfirmSave";
import { todayISODate } from "@/lib/dates";
import { productWithUm } from "@/lib/client/labels";
import { formatMonto, monto } from "@/lib/money";

type LineaDraft = {
  key: string;
  productId: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: string;
  fechaPedido: string;
  precio: number | null;
};

type LineaDoc = {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: number | null;
  fechaPedido: string | null;
  cantidadRecibida: number | null;
  precioUnitario?: number | null;
  valorPedido?: number | null;
  valorRecibido?: number | null;
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
  totalValorPedido?: number | null;
  totalValorRecibido?: number | null;
  lineas: LineaDoc[];
};

export default function CompraPage() {
  const { user, loading, can, fieldOk, canSeePrices, canEditOpenCompra } = useAuth();
  const seePrecios = canSeePrices;
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [lineas, setLineas] = useState<LineaDraft[]>([]);
  const [cantidad, setCantidad] = useState("");
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
  const [pedidoCantidad, setPedidoCantidad] = useState<Record<string, string>>({});
  const [pedidoQuitar, setPedidoQuitar] = useState<string[]>([]);
  const [pedidoNuevas, setPedidoNuevas] = useState<
    Array<{
      key: string;
      productId: string;
      codigo: string;
      producto: string;
      unidadMedida: string;
      cantidad: string;
      precio: number | null;
    }>
  >([]);
  const [pedidoProduct, setPedidoProduct] = useState<Product | null>(null);
  const [pedidoCantidadNueva, setPedidoCantidadNueva] = useState("");

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
        fechaPedido: todayISODate(),
        precio: seePrecios ? (product.precio ?? null) : null,
      },
    ]);
    setProduct(null);
    setCantidad("");
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
    const cantidades: Record<string, string> = {};
    for (const l of doc.lineas) {
      map[l.id] = {
        cantidadRecibida:
          l.cantidadRecibida === null || l.cantidadRecibida === undefined
            ? ""
            : String(l.cantidadRecibida),
        fechaRecepcion: l.fechaRecepcion || todayISODate(),
        facturaNotaVenta: l.facturaNotaVenta || "",
        observaciones: l.observaciones || "",
        proveedor: l.proveedor || "",
      };
      cantidades[l.id] =
        l.cantidad === null || l.cantidad === undefined ? "" : String(l.cantidad);
    }
    setRecepcion(map);
    setPedidoCantidad(cantidades);
    setPedidoQuitar([]);
    setPedidoNuevas([]);
    setPedidoProduct(null);
    setPedidoCantidadNueva("");
  }

  async function guardarPedido() {
    if (!activo) return;
    setGuardandoRecepcion(true);
    setError(null);
    try {
      const data = await api<Doc & { notice?: string }>(
        `/api/compra-recepcion/${activo.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            pedido: {
              quitar: pedidoQuitar,
              cantidades: activo.lineas
                .filter((l) => !pedidoQuitar.includes(l.id))
                .map((l) => ({
                  id: l.id,
                  cantidad:
                    pedidoCantidad[l.id] === "" || pedidoCantidad[l.id] == null
                      ? null
                      : Number(pedidoCantidad[l.id]),
                })),
              agregar: pedidoNuevas.map((l) => ({
                productId: l.productId,
                cantidad: l.cantidad === "" ? null : Number(l.cantidad),
              })),
            },
          }),
        },
      );
      setOk("Productos de la compra actualizados.");
      openRecepcion(data);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al editar la compra");
    } finally {
      setGuardandoRecepcion(false);
    }
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

  const compraCerrada = Boolean(
    activo && (activo.estado === "CERRADO" || activo.locked),
  );
  const puedeEditarPedido =
    canEditOpenCompra && Boolean(activo) && !compraCerrada;

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
                  {seePrecios && <th>Precio / UM</th>}
                  {seePrecios && <th>Monto pedido</th>}
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
                    <td>
                      <UmMark value={l.unidadMedida} />
                    </td>
                    {fieldOk("compra_recepcion", "cantidad") && (
                      <td>{l.cantidad || "—"}</td>
                    )}
                    {seePrecios && <td>{formatMonto(l.precio)}</td>}
                    {seePrecios && (
                      <td>
                        {formatMonto(
                          monto(
                            l.cantidad === "" ? null : Number(l.cantidad),
                            l.precio,
                          ),
                        )}
                      </td>
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
                  <td>
                    <UmMark value={product?.unidadMedida} />
                  </td>
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
                  {seePrecios && <td>{formatMonto(product?.precio)}</td>}
                  {seePrecios && (
                    <td>
                      {formatMonto(
                        monto(
                          cantidad === "" ? null : Number(cantidad),
                          product?.precio,
                        ),
                      )}
                    </td>
                  )}
                  {fieldOk("compra_recepcion", "fechaPedido") && (
                    <td>
                      <span className="date-lock">{todayISODate()}</span>
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
                {seePrecios && <th>Monto pedido</th>}
                {seePrecios && <th>Monto recibido</th>}
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
                          .map((l) => productWithUm(l.producto, l.unidadMedida))
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
                    {seePrecios && <td>{formatMonto(d.totalValorPedido)}</td>}
                    {seePrecios && <td>{formatMonto(d.totalValorRecibido)}</td>}
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
          <div className="modal-card modal-card-wide">
            <h2 className="heading-lg" style={{ marginBottom: 8 }}>
              Recepción — {activo.titulo || "Compra"}
            </h2>
            <p className="body-sm" style={{ marginTop: 0 }}>
              Completa cantidad recibida, factura y observaciones por producto.
              La fecha de recepción es la del día y no se puede cambiar.
              {puedeEditarPedido
                ? " También puedes añadir, quitar o cambiar la cantidad pedida, y guardar los productos antes de cerrar."
                : ""}
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>U.M.</th>
                    <th>Pedida</th>
                    {seePrecios && <th>Precio / UM</th>}
                    {seePrecios && <th>Monto pedido</th>}
                    <th>Recibida</th>
                    {seePrecios && <th>Monto recibido</th>}
                    <th>Fecha recepción</th>
                    <th>Factura</th>
                    <th>Proveedor</th>
                    <th>Obs.</th>
                    {puedeEditarPedido && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {activo.lineas
                    .filter((l) => !pedidoQuitar.includes(l.id))
                    .map((l) => {
                    const r = recepcion[l.id] || {
                      cantidadRecibida: "",
                      fechaRecepcion: todayISODate(),
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
                          <strong>{l.producto}</strong>
                          <div className="micro">{l.codigo}</div>
                        </td>
                        <td>
                          <UmMark value={l.unidadMedida} />
                        </td>
                        <td>
                          {puedeEditarPedido ? (
                            <input
                              className="input"
                              type="number"
                              min={0}
                              step="any"
                              value={pedidoCantidad[l.id] ?? ""}
                              onChange={(e) =>
                                setPedidoCantidad((prev) => ({
                                  ...prev,
                                  [l.id]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            (l.cantidad ?? "—")
                          )}
                        </td>
                        {seePrecios && <td>{formatMonto(l.precioUnitario)}</td>}
                        {seePrecios && (
                          <td>
                            {formatMonto(
                              puedeEditarPedido
                                ? monto(
                                    pedidoCantidad[l.id] === "" ||
                                      pedidoCantidad[l.id] == null
                                      ? null
                                      : Number(pedidoCantidad[l.id]),
                                    l.precioUnitario,
                                  )
                                : l.valorPedido,
                            )}
                          </td>
                        )}
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
                        {seePrecios && (
                          <td>
                            {formatMonto(
                              monto(
                                r.cantidadRecibida === ""
                                  ? null
                                  : Number(r.cantidadRecibida),
                                l.precioUnitario,
                              ),
                            )}
                          </td>
                        )}
                        <td>
                          <span className="date-lock">
                            {r.fechaRecepcion || todayISODate()}
                          </span>
                        </td>
                        <td className="col-text">
                          <textarea
                            className="textarea textarea-compact"
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
                        <td className="col-text">
                          <textarea
                            className="textarea textarea-compact"
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
                        <td className="col-text">
                          <textarea
                            className="textarea textarea-compact"
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
                        {puedeEditarPedido && (
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={
                                activo.lineas.filter(
                                  (x) => !pedidoQuitar.includes(x.id),
                                ).length +
                                  pedidoNuevas.length <=
                                1
                              }
                              onClick={() =>
                                setPedidoQuitar((prev) => [...prev, l.id])
                              }
                            >
                              Quitar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {pedidoNuevas.map((l) => (
                    <tr key={l.key}>
                      <td>
                        <strong>{l.producto}</strong>
                        <div className="micro">{l.codigo}</div>
                      </td>
                      <td>
                        <UmMark value={l.unidadMedida} />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="any"
                          value={l.cantidad}
                          onChange={(e) =>
                            setPedidoNuevas((prev) =>
                              prev.map((row) =>
                                row.key === l.key
                                  ? { ...row, cantidad: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </td>
                      {seePrecios && <td>{formatMonto(l.precio)}</td>}
                      {seePrecios && (
                        <td>
                          {formatMonto(
                            monto(
                              l.cantidad === "" ? null : Number(l.cantidad),
                              l.precio,
                            ),
                          )}
                        </td>
                      )}
                      <td colSpan={seePrecios ? 6 : 5} className="micro muted">
                        Nuevo, aún sin recepción
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            setPedidoNuevas((prev) =>
                              prev.filter((row) => row.key !== l.key),
                            )
                          }
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {puedeEditarPedido && (
              <div className="row" style={{ marginTop: 12, gap: 8, alignItems: "end" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="micro muted" style={{ marginBottom: 4 }}>
                    Añadir producto
                  </div>
                  <ProductPicker
                    value={pedidoProduct?.id || ""}
                    onChange={setPedidoProduct}
                  />
                </div>
                <div>
                  <div className="micro muted" style={{ marginBottom: 4 }}>
                    Cantidad
                  </div>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="any"
                    value={pedidoCantidadNueva}
                    onChange={(e) => setPedidoCantidadNueva(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!pedidoProduct}
                  onClick={() => {
                    if (!pedidoProduct) return;
                    setPedidoNuevas((prev) => [
                      ...prev,
                      {
                        key: `${pedidoProduct.id}-${Date.now()}`,
                        productId: pedidoProduct.id,
                        codigo: pedidoProduct.codigo,
                        producto: pedidoProduct.producto,
                        unidadMedida: pedidoProduct.unidadMedida,
                        cantidad: pedidoCantidadNueva,
                        precio: pedidoProduct.precio ?? null,
                      },
                    ]);
                    setPedidoProduct(null);
                    setPedidoCantidadNueva("");
                  }}
                >
                  Añadir
                </button>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActivo(null)}
              >
                Cerrar
              </button>
              {(activo.estado !== "CERRADO" || user.role === "SUPER_USUARIO") && (
                <>
                  {puedeEditarPedido && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={guardandoRecepcion}
                      onClick={() => void guardarPedido()}
                    >
                      Guardar productos
                    </button>
                  )}
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
