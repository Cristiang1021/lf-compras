import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { bodegas } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { bodegaCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "bodegas", "canRead");
    const rows = await db.query.bodegas.findMany({
      orderBy: [desc(bodegas.createdAt)],
    });
    return jsonOk(rows.filter((b) => b.isActive));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "bodegas", "canCreate");
    const body = bodegaCreateSchema.parse(await request.json());

    const exists = await db.query.bodegas.findFirst({
      where: eq(bodegas.nombre, body.nombre),
    });
    if (exists) return jsonError("Ya existe una bodega con ese nombre", 409);

    const id = randomUUID();
    await db.insert(bodegas).values({ id, nombre: body.nombre, isActive: true });
    const created = await db.query.bodegas.findFirst({
      where: eq(bodegas.id, id),
    });
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
