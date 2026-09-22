import { asc, desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError } from "@/lib/api/response";
import { excelResponse, exportProduccionExcel } from "@/lib/export/excel";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { bodegas, produccionDocs, produccionLineas } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "produccion", "canExport");

    const docs = await db
      .select()
      .from(produccionDocs)
      .orderBy(desc(produccionDocs.createdAt));
    const allBodegas = await db.select().from(bodegas);
    const byId = new Map(allBodegas.map((b) => [b.id, b.nombre]));

    const flat = [];
    let n = 1;
    for (const doc of docs) {
      const lineas = await db
        .select()
        .from(produccionLineas)
        .where(eq(produccionLineas.docId, doc.id))
        .orderBy(asc(produccionLineas.orden));
      const registro = `P-${String(n).padStart(4, "0")}`;
      for (const l of lineas) {
        flat.push({
          registro,
          fechaRegistro: doc.createdAt,
          codigo: l.codigo,
          producto: l.producto,
          cantidad: l.cantidad,
          unidadMedida: l.unidadMedida,
          fechaProduccion: l.fechaProduccion,
          detalleProduccion: l.detalleProduccion,
          origenNombre: l.origenBodegaId
            ? byId.get(l.origenBodegaId) || null
            : null,
          destinoNombre: l.destinoBodegaId
            ? byId.get(l.destinoBodegaId) || null
            : null,
          observaciones: l.observaciones,
        });
      }
      n += 1;
    }

    const buffer = await exportProduccionExcel(flat);
    return excelResponse(buffer, "produccion.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
