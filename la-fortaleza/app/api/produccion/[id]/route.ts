import { asc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { produccionDocs, produccionLineas } from "@/lib/db/schema";
import { assertCanEditLocked, requirePermission } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "produccion", "canRead");
    const { id } = await ctx.params;
    const [doc] = await db
      .select()
      .from(produccionDocs)
      .where(eq(produccionDocs.id, id))
      .limit(1);
    if (!doc) return jsonError("Registro no encontrado", 404);
    const lineas = await db
      .select()
      .from(produccionLineas)
      .where(eq(produccionLineas.docId, id))
      .orderBy(asc(produccionLineas.orden));
    return jsonOk({ ...doc, totalLineas: lineas.length, lineas });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "produccion", "canDelete");
    const { id } = await ctx.params;
    const [doc] = await db
      .select()
      .from(produccionDocs)
      .where(eq(produccionDocs.id, id))
      .limit(1);
    if (!doc) return jsonError("Registro no encontrado", 404);
    assertCanEditLocked(user, doc.locked);
    await db.delete(produccionLineas).where(eq(produccionLineas.docId, id));
    await db.delete(produccionDocs).where(eq(produccionDocs.id, id));
    return jsonOk({ id, deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
