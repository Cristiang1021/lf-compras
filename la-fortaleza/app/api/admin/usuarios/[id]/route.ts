import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { updateUserSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

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

export async function GET(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "usuarios", "canRead");
    const { id } = await ctx.params;
    const row = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!row) return jsonError("Usuario no encontrado", 404);
    return jsonOk(publicUser(row));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "usuarios", "canUpdate");
    const { id } = await ctx.params;
    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) return jsonError("Usuario no encontrado", 404);

    const body = updateUserSchema.parse(await request.json());

    // Prevent locking yourself out of the only super user accidentally via role demotion without care
    if (
      existing.role === "SUPER_USUARIO" &&
      body.role &&
      body.role !== "SUPER_USUARIO" &&
      existing.id === user.id
    ) {
      return jsonError("No puedes quitarte el rol de super usuario a ti mismo", 400);
    }

    const patch: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (body.fullName !== undefined) patch.fullName = body.fullName;
    if (body.role !== undefined) patch.role = body.role;
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    if (body.password) {
      patch.passwordHash = await bcrypt.hash(body.password, 12);
    }

    await db.update(users).set(patch).where(eq(users.id, id));
    const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
    return jsonOk(publicUser(updated!));
  } catch (error) {
    return handleRouteError(error);
  }
}
