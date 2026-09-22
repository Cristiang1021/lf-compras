import { randomUUID } from "node:crypto";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { products } from "@/lib/db/schema";
import { pickAllowedFields, requirePermission } from "@/lib/permissions";
import { FIELD_KEYS, productCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "productos", "canRead");

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const activeOnly = searchParams.get("active") !== "false";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || 20)),
    );
    const offset = (page - 1) * pageSize;

    const filters = [];
    if (activeOnly) filters.push(eq(products.isActive, true));
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(like(products.codigo, pattern), like(products.producto, pattern))!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    const [totalRow] = await db
      .select({ value: count() })
      .from(products)
      .where(where);

    const items = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset);

    return jsonOk({
      items,
      total: totalRow?.value ?? 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((totalRow?.value ?? 0) / pageSize)),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    const perm = await requirePermission(user, "productos", "canCreate");
    const body = productCreateSchema.parse(await request.json());

    const allowed = pickAllowedFields(body, perm.fieldAccess, FIELD_KEYS.productos);
    if (!allowed.codigo || !allowed.producto || !allowed.unidadMedida) {
      return jsonError(
        "No tienes permiso para completar los campos del producto",
        403,
      );
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.codigo, allowed.codigo),
    });
    if (existing) {
      return jsonError("Ya existe un producto con ese código", 409);
    }

    const id = randomUUID();
    await db.insert(products).values({
      id,
      codigo: allowed.codigo,
      producto: allowed.producto,
      unidadMedida: allowed.unidadMedida,
      createdBy: user.id,
      isActive: true,
    });

    const created = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    return jsonOk(
      {
        ...created,
        lockedNotice:
          "Producto guardado. Las ediciones posteriores requieren permiso de actualización (normalmente solo super usuario).",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
