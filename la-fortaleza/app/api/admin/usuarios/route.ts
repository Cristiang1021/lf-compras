import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validators";

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "usuarios", "canRead");

    const rows = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });
    return jsonOk(rows.map(publicUser));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "usuarios", "canCreate");
    const body = createUserSchema.parse(await request.json());

    const exists = await db.query.users.findFirst({
      where: eq(users.username, body.username),
    });
    if (exists) return jsonError("El nombre de usuario ya existe", 409);

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);
    await db.insert(users).values({
      id,
      username: body.username,
      passwordHash,
      fullName: body.fullName,
      email: body.email?.trim().toLowerCase() || null,
      role: body.role,
      isActive: body.isActive ?? true,
    });

    const created = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return jsonOk(publicUser(created!), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
