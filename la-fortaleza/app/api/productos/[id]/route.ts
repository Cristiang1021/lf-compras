import { eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { products } from "@/lib/db/schema";
import {
  assertCanEditLocked,
  pickAllowedFields,
  requirePermission,
} from "@/lib/permissions";
import { FIELD_KEYS, productUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "productos", "canRead");
    const { id } = await ctx.params;
    const row = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!row) return jsonError("Producto no encontrado", 404);
    return jsonOk(row);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    const perm = await requirePermission(user, "productos", "canUpdate");
    // Product master: treat as locked for non-super (only SUPER has canUpdate by default)
    assertCanEditLocked(user, user.role !== "SUPER_USUARIO");

    const { id } = await ctx.params;
    const existing = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!existing) return jsonError("Producto no encontrado", 404);

    const body = productUpdateSchema.parse(await request.json());
    const allowed = pickAllowedFields(body, perm.fieldAccess, [
      ...FIELD_KEYS.productos,
      "isActive",
    ]);

    if (Object.keys(allowed).length === 0) {
      return jsonError("Ningún campo permitido para actualizar", 403);
    }

    if (allowed.codigo && allowed.codigo !== existing.codigo) {
      const clash = await db.query.products.findFirst({
        where: eq(products.codigo, allowed.codigo),
      });
      if (clash) return jsonError("Código ya en uso", 409);
    }

    await db
      .update(products)
      .set({
        ...allowed,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, id));

    const updated = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    return jsonOk(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "productos", "canDelete");
    assertCanEditLocked(user, true);

    const { id } = await ctx.params;
    const existing = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!existing) return jsonError("Producto no encontrado", 404);

    // Soft delete — preserves history on movements
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id));

    return jsonOk({ id, isActive: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
