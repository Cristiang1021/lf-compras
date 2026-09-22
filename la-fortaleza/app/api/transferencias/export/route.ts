import { asc, desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError } from "@/lib/api/response";
import { excelResponse, exportTransferenciasExcel } from "@/lib/export/excel";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { bodegas, transferenciaDocs, transferenciaLineas } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "transferencias", "canExport");

    const docs = await db
      .select()
      .from(transferenciaDocs)
      .orderBy(desc(transferenciaDocs.createdAt));
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
        });
      }
      n += 1;
    }

    const buffer = await exportTransferenciasExcel(flat);
    return excelResponse(buffer, "transferencias.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
