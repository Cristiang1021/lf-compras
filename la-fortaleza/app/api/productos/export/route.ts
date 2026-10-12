import { desc } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError } from "@/lib/api/response";
import { excelResponse, exportProductosExcel } from "@/lib/export/excel";
import {
  buildTablePdf,
  pdfResponse,
  productosPdfPayload,
} from "@/lib/export/pdf";
import { parseExportFormat } from "@/lib/export/params";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { products } from "@/lib/db/schema";
import { canSeePrecios, requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "productos", "canExport");

    const format = parseExportFormat(request);
    const rows = await db.query.products.findMany({
      orderBy: [desc(products.codigo)],
    });
    const active = rows.filter((r) => r.isActive);
    const includePrecio = await canSeePrecios(user);

    if (format === "pdf") {
      const payload = productosPdfPayload(
        active.map((r) => ({
          codigo: r.codigo,
          producto: r.producto,
          unidadMedida: r.unidadMedida,
          precio: r.precio,
        })),
        includePrecio,
      );
      const buffer = await buildTablePdf(payload);
      return pdfResponse(buffer, "maestro-productos.pdf");
    }

    const buffer = await exportProductosExcel(active, { includePrecio });
    return excelResponse(buffer, "maestro-productos.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
