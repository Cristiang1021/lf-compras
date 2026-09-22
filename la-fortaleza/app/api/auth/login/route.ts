import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@/lib/auth/jwt";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { MODULES, users } from "@/lib/db/schema";
import { getRolePermission } from "@/lib/permissions";
import { loginSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = loginSchema.parse(await request.json());
    const user = await db.query.users.findFirst({
      where: eq(users.username, body.username),
    });

    if (!user || !user.isActive) {
      return jsonError("Credenciales inválidas", 401);
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return jsonError("Credenciales inválidas", 401);
    }

    const token = await signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    const permissions = [];
    for (const module of MODULES) {
      permissions.push({
        module,
        ...(await getRolePermission(user.role, module)),
      });
    }

    return jsonOk({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      permissions,
      notice: "Sesión iniciada correctamente.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
