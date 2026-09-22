import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { transferenciaDocs, transferenciaLineas } from "@/lib/db/schema";
import { pickAllowedFields, requirePermission } from "@/lib/permissions";
import { getActiveProductOrThrow, productSnapshot } from "@/lib/services/products";
import { FIELD_KEYS, transferenciaDocCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "transferencias", "canRead");

    const docs = await db
      .select()
      .from(transferenciaDocs)
      .orderBy(desc(transferenciaDocs.createdAt));

    const result = [];
    for (const doc of docs) {
      const lineas = await db
        .select()
        .from(transferenciaLineas)
        .where(eq(transferenciaLineas.docId, doc.id))
        .orderBy(asc(transferenciaLineas.orden));
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
    const perm = await requirePermission(user, "transferencias", "canCreate");
    const body = transferenciaDocCreateSchema.parse(await request.json());

    const docId = randomUUID();
    await db.insert(transferenciaDocs).values({
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
        FIELD_KEYS.transferencias,
      );
      await db.insert(transferenciaLineas).values({
        id: randomUUID(),
        docId,
        orden,
        ...productSnapshot(product),
        cantidad: fields.cantidad ?? null,
        fechaTransferencia: fields.fechaTransferencia ?? null,
        origenBodegaId: fields.origenBodegaId ?? null,
        destinoBodegaId: fields.destinoBodegaId ?? null,
        observacion: fields.observacion ?? null,
      });
      orden += 1;
    }

    const [created] = await db
      .select()
      .from(transferenciaDocs)
      .where(eq(transferenciaDocs.id, docId))
      .limit(1);
    const lineas = await db
      .select()
      .from(transferenciaLineas)
      .where(eq(transferenciaLineas.docId, docId))
      .orderBy(asc(transferenciaLineas.orden));

    return jsonOk(
      {
        ...created,
        totalLineas: lineas.length,
        lineas,
        lockedNotice: "Transferencia guardada y bloqueada (todas las líneas).",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
