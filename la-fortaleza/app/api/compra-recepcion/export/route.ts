import { asc, desc, eq, inArray } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError } from "@/lib/api/response";
import { excelResponse, exportCompraExcel } from "@/lib/export/excel";
import {
  buildTablePdf,
  compraPdfPayload,
  pdfResponse,
} from "@/lib/export/pdf";
import { parseExportFormat, parseExportIds } from "@/lib/export/params";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { compraDocs, compraLineas } from "@/lib/db/schema";
import { canSeePrecios, requirePermission } from "@/lib/permissions";
import { monto } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "compra_recepcion", "canExport");

    const selectedIds = parseExportIds(request);
    const format = parseExportFormat(request);

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

    const includeMoney = await canSeePrecios(user);
    if (format === "pdf") {
      const payload = compraPdfPayload(flat, includeMoney);
      const buffer = await buildTablePdf(payload);
      return pdfResponse(buffer, "compra-vs-recepcion.pdf");
    }

    const buffer = await exportCompraExcel(flat, { includeMoney });
    return excelResponse(buffer, "compra-vs-recepcion.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
