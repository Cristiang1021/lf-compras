import { desc } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError } from "@/lib/api/response";
import { excelResponse, exportProductosExcel } from "@/lib/export/excel";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { products } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "productos", "canExport");

    const rows = await db.query.products.findMany({
      orderBy: [desc(products.codigo)],
    });
    const buffer = await exportProductosExcel(rows.filter((r) => r.isActive));
    return excelResponse(buffer, "maestro-productos.xlsx");
  } catch (error) {
    return handleRouteError(error);
  }
}
