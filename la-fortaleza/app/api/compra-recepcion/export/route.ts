import { asc, desc, eq, inArray } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError } from "@/lib/api/response";
import { excelResponse, exportCompraExcel } from "@/lib/export/excel";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { compraDocs, compraLineas } from "@/lib/db/schema";
import { canSeePrecios, requirePermission } from "@/lib/permissions";
import { monto } from "@/lib/money";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "compra_recepcion", "canExport");

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids")?.trim();
    const selectedIds = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let docs = await db
      .select()
      .from(compraDocs)
      .orderBy(desc(compraDocs.createdAt));

    if (selectedIds.length > 0) {
      docs = await db
        .select()
        .from(compraDocs)
        .where(inArray(compraDocs.id, selectedIds))
        .orderBy(desc(compraDocs.createdAt));
      if (docs.length === 0) {
        return jsonError("No hay registros seleccionados válidos", 400);
      }
    }

    const flat = [];
    let n = 1;
    for (const doc of docs) {
      const lineas = await db
        .select()
        .from(compraLineas)
        .where(eq(compraLineas.docId, doc.id))
        .orderBy(asc(compraLineas.orden));
      const registro = `C-${String(n).padStart(4, "0")}`;
      for (const l of lineas) {
        flat.push({
          registro,
          fechaRegistro: doc.createdAt,
          codigo: l.codigo,
          producto: l.producto,
          cantidad: l.cantidad,
          unidadMedida: l.unidadMedida,
          fechaPedido: l.fechaPedido,
          cantidadRecibida: l.cantidadRecibida,
          proveedor: l.proveedor,
          fechaRecepcion: l.fechaRecepcion,
          facturaNotaVenta: l.facturaNotaVenta,
          observaciones: l.observaciones,
          precioUnitario: l.precioUnitario,
          valorPedido: monto(l.cantidad, l.precioUnitario),
          valorRecibido: monto(l.cantidadRecibida, l.precioUnitario),
        });
      }
      n += 1;
    }

    const buffer = await exportCompraExcel(flat, {
      includeMoney: await canSeePrecios(user),
    });
    return excelResponse(buffer, "compra-vs-recepcion.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
