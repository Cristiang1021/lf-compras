import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { compraDocs, compraLineas } from "@/lib/db/schema";
import { pickAllowedFields, requirePermission } from "@/lib/permissions";
import { getActiveProductOrThrow, productSnapshot } from "@/lib/services/products";
import { compraDocCreateSchema, FIELD_KEYS } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "compra_recepcion", "canRead");

    const docs = await db
      .select()
      .from(compraDocs)
      .orderBy(desc(compraDocs.createdAt));

    const result = [];
    for (const doc of docs) {
      const lineas = await db
        .select()
        .from(compraLineas)
        .where(eq(compraLineas.docId, doc.id))
        .orderBy(asc(compraLineas.orden));
      result.push({
        ...doc,
        totalLineas: lineas.length,
        lineas,
      });
    }

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    const perm = await requirePermission(user, "compra_recepcion", "canCreate");
    const body = compraDocCreateSchema.parse(await request.json());

    const docId = randomUUID();
    await db.insert(compraDocs).values({
      id: docId,
      titulo: body.titulo ?? null,
      notas: body.notas ?? null,
      estado: "PEDIDO",
      locked: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    let orden = 0;
    for (const linea of body.lineas) {
      const product = await getActiveProductOrThrow(linea.productId);
      const fields = pickAllowedFields(
        linea,
        perm.fieldAccess,
        FIELD_KEYS.compra_recepcion,
      );
      await db.insert(compraLineas).values({
        id: randomUUID(),
        docId,
        orden,
        ...productSnapshot(product),
        cantidad: fields.cantidad ?? null,
        fechaPedido: fields.fechaPedido ?? null,
        cantidadRecibida: fields.cantidadRecibida ?? null,
        proveedor: fields.proveedor ?? null,
        fechaRecepcion: fields.fechaRecepcion ?? null,
        facturaNotaVenta: fields.facturaNotaVenta ?? null,
        observaciones: fields.observaciones ?? null,
      });
      orden += 1;
    }

    const [created] = await db
      .select()
      .from(compraDocs)
      .where(eq(compraDocs.id, docId))
      .limit(1);
    const lineas = await db
      .select()
      .from(compraLineas)
      .where(eq(compraLineas.docId, docId))
      .orderBy(asc(compraLineas.orden));

    return jsonOk(
      {
        ...created,
        totalLineas: lineas.length,
        lineas,
        lockedNotice:
          "Compra guardada. Queda abierta para que otro usuario complete la recepción.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
