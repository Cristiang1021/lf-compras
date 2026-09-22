import type { Role } from "@/lib/client/auth";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_USUARIO: "Super usuario",
  CONTABILIDAD: "Contabilidad",
  CHEF: "Chef",
  BODEGA: "Bodega",
};

export function roleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role;
}

const FIELD_LABELS: Record<string, string> = {
  codigo: "Código",
  producto: "Producto",
  unidadMedida: "Unidad de medida",
  cantidad: "Cantidad",
  fechaPedido: "Fecha de pedido",
  cantidadRecibida: "Cantidad recibida",
  proveedor: "Proveedor",
  fechaRecepcion: "Fecha de recepción",
  facturaNotaVenta: "Factura / nota de venta",
  observaciones: "Observaciones",
  fechaTransferencia: "Fecha de transferencia",
  origenBodegaId: "Bodega de origen",
  destinoBodegaId: "Bodega de destino",
  observacion: "Observación",
  fechaProduccion: "Fecha de producción",
  detalleProduccion: "Detalle de producción",
};

export function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key;
}
