import { canSeePrecios } from "@/lib/permissions";
import { monto, sumMontos } from "@/lib/money";
import type { Role } from "@/lib/db/schema";

type Viewer = { role: Role };

type CompraLinea = {
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
  precioUnitario: number | null;
};

type MovLinea = {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  cantidad: number | null;
  precioUnitario: number | null;
};

export async function presentCompraLineas(user: Viewer, lineas: CompraLinea[]) {
  const see = await canSeePrecios(user);
  const mapped = lineas.map((l) => {
    const base = {
      id: l.id,
      codigo: l.codigo,
      producto: l.producto,
      unidadMedida: l.unidadMedida,
      cantidad: l.cantidad,
      fechaPedido: l.fechaPedido,
      cantidadRecibida: l.cantidadRecibida,
      proveedor: l.proveedor,
      fechaRecepcion: l.fechaRecepcion,
      facturaNotaVenta: l.facturaNotaVenta,
      observaciones: l.observaciones,
    };
    if (!see) return base;
    return {
      ...base,
      precioUnitario: l.precioUnitario,
      valorPedido: monto(l.cantidad, l.precioUnitario),
      valorRecibido: monto(l.cantidadRecibida, l.precioUnitario),
    };
  });
  if (!see) return { lineas: mapped };
  return {
    lineas: mapped,
    totalValorPedido: sumMontos(
      mapped.map((l) => ("valorPedido" in l ? l.valorPedido : null)),
    ),
    totalValorRecibido: sumMontos(
      mapped.map((l) => ("valorRecibido" in l ? l.valorRecibido : null)),
    ),
  };
}

export async function presentMovLineas<T extends MovLinea>(user: Viewer, lineas: T[]) {
  const see = await canSeePrecios(user);
  const mapped = lineas.map((l) => {
    const { precioUnitario, ...rest } = l;
    if (!see) return rest;
    return {
      ...rest,
      precioUnitario,
      valor: monto(l.cantidad, precioUnitario),
    };
  });
  if (!see) return { lineas: mapped };
  const valores = lineas.map((l) => monto(l.cantidad, l.precioUnitario));
  return {
    lineas: mapped,
    totalValor: sumMontos(valores),
  };
}
