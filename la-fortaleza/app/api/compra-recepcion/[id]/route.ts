import { asc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { compraDocs, compraLineas } from "@/lib/db/schema";
import {
  assertCanEditLocked,
  pickAllowedFields,
  requirePermission,
} from "@/lib/permissions";
import { todayISODate } from "@/lib/dates";
import { compraRecepcionUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

const RECEPCION_FIELDS = [
  "cantidadRecibida",
  "fechaRecepcion",
  "facturaNotaVenta",
  "observaciones",
  "proveedor",
] as const;

export async function GET(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "compra_recepcion", "canRead");
    const { id } = await ctx.params;
    const [doc] = await db
      .select()
      .from(compraDocs)
      .where(eq(compraDocs.id, id))
      .limit(1);
    if (!doc) return jsonError("Registro no encontrado", 404);
    const lineas = await db
      .select()
      .from(compraLineas)
      .where(eq(compraLineas.docId, id))
      .orderBy(asc(compraLineas.orden));
    return jsonOk({ ...doc, totalLineas: lineas.length, lineas });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Completar datos de recepción línea por línea (sin reabrir el pedido). */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    const { getRolePermission } = await import("@/lib/permissions");
    const perm = await getRolePermission(user.role, "compra_recepcion");
    if (!perm.canUpdate && !perm.canCreate && user.role !== "SUPER_USUARIO") {
      return jsonError("Sin permiso para completar la recepción", 403);
    }
    const { id } = await ctx.params;
    const [doc] = await db
      .select()
      .from(compraDocs)
      .where(eq(compraDocs.id, id))
      .limit(1);
    if (!doc) return jsonError("Registro no encontrado", 404);

    if (doc.estado === "CERRADO" || doc.locked) {
      if (user.role !== "SUPER_USUARIO") {
        return jsonError(
          "Esta compra ya está cerrada. Solo el super usuario puede modificarla.",
          403,
        );
      }
    }

    const body = compraRecepcionUpdateSchema.parse(await request.json());

    for (const linea of body.lineas) {
      const [existing] = await db
        .select()
        .from(compraLineas)
        .where(eq(compraLineas.id, linea.id))
        .limit(1);
      if (!existing || existing.docId !== id) {
        return jsonError(`Línea no válida: ${linea.id}`, 400);
      }

      const allowed = pickAllowedFields(
        linea,
        perm.fieldAccess,
        RECEPCION_FIELDS,
      );
      delete allowed.fechaRecepcion;
      if (Object.keys(allowed).length === 0) {
        return jsonError(
          "No tienes permiso para llenar campos de recepción",
          403,
        );
      }

      await db
        .update(compraLineas)
        .set({
          ...allowed,
          fechaRecepcion: existing.fechaRecepcion || todayISODate(),
        })
        .where(eq(compraLineas.id, linea.id));
    }

    const nextEstado = body.cerrar ? "CERRADO" : doc.estado || "PEDIDO";
    await db
      .update(compraDocs)
      .set({
        estado: nextEstado,
        locked: body.cerrar ? true : doc.locked,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(compraDocs.id, id));

    const [updated] = await db
      .select()
      .from(compraDocs)
      .where(eq(compraDocs.id, id))
      .limit(1);
    const lineas = await db
      .select()
      .from(compraLineas)
      .where(eq(compraLineas.docId, id))
      .orderBy(asc(compraLineas.orden));

    return jsonOk({
      ...updated,
      totalLineas: lineas.length,
      lineas,
      notice: body.cerrar
        ? "Recepción guardada y compra cerrada."
        : "Datos de recepción actualizados.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "compra_recepcion", "canDelete");
    const { id } = await ctx.params;
    const [doc] = await db
      .select()
      .from(compraDocs)
      .where(eq(compraDocs.id, id))
      .limit(1);
    if (!doc) return jsonError("Registro no encontrado", 404);
    assertCanEditLocked(user, doc.locked || doc.estado === "CERRADO");
    await db.delete(compraLineas).where(eq(compraLineas.docId, id));
    await db.delete(compraDocs).where(eq(compraDocs.id, id));
    return jsonOk({ id, deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
