import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { MODULES, ROLES, rolePermissions } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { upsertPermissionsSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "permisos", "canRead");

    const rows = await db.query.rolePermissions.findMany();
    return jsonOk({
      roles: ROLES,
      modules: MODULES,
      permissions: rows,
      fieldKeysHint: {
        productos: ["codigo", "producto", "unidadMedida"],
        compra_recepcion: [
          "cantidad",
          "fechaPedido",
          "cantidadRecibida",
          "proveedor",
          "fechaRecepcion",
          "facturaNotaVenta",
          "observaciones",
        ],
        transferencias: [
          "cantidad",
          "fechaTransferencia",
          "origenBodegaId",
          "destinoBodegaId",
          "observacion",
        ],
        produccion: [
          "cantidad",
          "fechaProduccion",
          "detalleProduccion",
          "origenBodegaId",
          "destinoBodegaId",
          "observaciones",
        ],
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "permisos", "canUpdate");
    const body = upsertPermissionsSchema.parse(await request.json());

    for (const item of body.permissions) {
      // Super usuario permissions are always full in code; skip storing demotions
      if (item.role === "SUPER_USUARIO") continue;

      const existing = await db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.role, item.role),
          eq(rolePermissions.module, item.module),
        ),
      });

      if (existing) {
        await db
          .update(rolePermissions)
          .set({
            canRead: item.canRead,
            canCreate: item.canCreate,
            canUpdate: item.canUpdate,
            canDelete: item.canDelete,
            canExport: item.canExport,
            fieldAccess: item.fieldAccess,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(rolePermissions.id, existing.id));
      } else {
        await db.insert(rolePermissions).values({
          id: randomUUID(),
          role: item.role,
          module: item.module,
          canRead: item.canRead,
          canCreate: item.canCreate,
          canUpdate: item.canUpdate,
          canDelete: item.canDelete,
          canExport: item.canExport,
          fieldAccess: item.fieldAccess,
        });
      }
    }

    const rows = await db.query.rolePermissions.findMany();
    return jsonOk({ updated: true, permissions: rows });
  } catch (error) {
    return handleRouteError(error);
  }
}
