import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { produccionDocs, produccionLineas } from "@/lib/db/schema";
import { pickAllowedFields, requirePermission } from "@/lib/permissions";
import { getActiveProductOrThrow, productSnapshot } from "@/lib/services/products";
import { FIELD_KEYS, produccionDocCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "produccion", "canRead");

    const docs = await db
      .select()
      .from(produccionDocs)
      .orderBy(desc(produccionDocs.createdAt));

    const result = [];
    for (const doc of docs) {
      const lineas = await db
        .select()
        .from(produccionLineas)
        .where(eq(produccionLineas.docId, doc.id))
        .orderBy(asc(produccionLineas.orden));
      result.push({ ...doc, totalLineas: lineas.length, lineas });
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
    const perm = await requirePermission(user, "produccion", "canCreate");
    const body = produccionDocCreateSchema.parse(await request.json());

    const docId = randomUUID();
    await db.insert(produccionDocs).values({
      id: docId,
      titulo: body.titulo ?? null,
      notas: body.notas ?? null,
      locked: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    let orden = 0;
    for (const linea of body.lineas) {
      const product = await getActiveProductOrThrow(linea.productId);
      const fields = pickAllowedFields(
        linea,
        perm.fieldAccess,
        FIELD_KEYS.produccion,
      );
      await db.insert(produccionLineas).values({
        id: randomUUID(),
        docId,
        orden,
        ...productSnapshot(product),
        cantidad: fields.cantidad ?? null,
        fechaProduccion: fields.fechaProduccion ?? null,
        detalleProduccion: fields.detalleProduccion ?? null,
        origenBodegaId: fields.origenBodegaId ?? null,
        destinoBodegaId: fields.destinoBodegaId ?? null,
        observaciones: fields.observaciones ?? null,
      });
      orden += 1;
    }

    const [created] = await db
      .select()
      .from(produccionDocs)
      .where(eq(produccionDocs.id, docId))
      .limit(1);
    const lineas = await db
      .select()
      .from(produccionLineas)
      .where(eq(produccionLineas.docId, docId))
      .orderBy(asc(produccionLineas.orden));

    return jsonOk(
      {
        ...created,
        totalLineas: lineas.length,
        lineas,
        lockedNotice: "Producción guardada y bloqueada (todas las líneas).",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
