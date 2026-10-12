import { asc, desc, eq, inArray } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError } from "@/lib/api/response";
import {
  excelResponse,
  exportTransferenciasExcel,
} from "@/lib/export/excel";
import {
  buildTablePdf,
  pdfResponse,
  transferenciasPdfPayload,
} from "@/lib/export/pdf";
import { parseExportFormat, parseExportIds } from "@/lib/export/params";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { bodegas, transferenciaDocs, transferenciaLineas } from "@/lib/db/schema";
import { canSeePrecios, requirePermission } from "@/lib/permissions";
import { monto } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "transferencias", "canExport");

    const selectedIds = parseExportIds(request);
    const format = parseExportFormat(request);

    let docs = await db
      .select()
      .from(transferenciaDocs)
      .orderBy(desc(transferenciaDocs.createdAt));

    if (selectedIds.length > 0) {
      docs = await db
        .select()
        .from(transferenciaDocs)
        .where(inArray(transferenciaDocs.id, selectedIds))
        .orderBy(desc(transferenciaDocs.createdAt));
      if (docs.length === 0) {
        return jsonError("No hay registros seleccionados válidos", 400);
      }
    }

    const allBodegas = await db.select().from(bodegas);
    const byId = new Map(allBodegas.map((b) => [b.id, b.nombre]));

    const flat = [];
    let n = 1;
    for (const doc of docs) {
      const lineas = await db
        .select()
        .from(transferenciaLineas)
        .where(eq(transferenciaLineas.docId, doc.id))
        .orderBy(asc(transferenciaLineas.orden));
      const registro = `T-${String(n).padStart(4, "0")}`;
      for (const l of lineas) {
        flat.push({
          registro,
          fechaRegistro: doc.createdAt,
          codigo: l.codigo,
          producto: l.producto,
          cantidad: l.cantidad,
          unidadMedida: l.unidadMedida,
          fechaTransferencia: l.fechaTransferencia,
          origenNombre: l.origenBodegaId
            ? byId.get(l.origenBodegaId) || null
            : null,
          destinoNombre: l.destinoBodegaId
            ? byId.get(l.destinoBodegaId) || null
            : null,
          observacion: l.observacion,
          precioUnitario: l.precioUnitario,
          valor: monto(l.cantidad, l.precioUnitario),
        });
      }
      n += 1;
    }

    const includeMoney = await canSeePrecios(user);
    if (format === "pdf") {
      const payload = transferenciasPdfPayload(flat, includeMoney);
      const buffer = await buildTablePdf(payload);
      return pdfResponse(buffer, "transferencias.pdf");
    }

    const buffer = await exportTransferenciasExcel(flat, { includeMoney });
    return excelResponse(buffer, "transferencias.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
