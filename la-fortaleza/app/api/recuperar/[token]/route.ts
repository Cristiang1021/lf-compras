import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { passwordResets, users } from "@/lib/db/schema";
import { hashInviteToken } from "@/lib/mail";
import { resetPasswordSchema } from "@/lib/validators";

export const runtime = "nodejs";

async function findValidReset(token: string) {
  const row = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.tokenHash, hashInviteToken(token)),
      isNull(passwordResets.usedAt),
    ),
  });
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, row.userId),
  });
  if (!user?.isActive) return null;
  return { row, user };
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    await ensureDatabase();
    const { token } = await ctx.params;
    const found = await findValidReset(token);
    if (!found) {
      return jsonError("Este enlace no es válido o ya venció", 404);
    }
    return jsonOk({
      username: found.user.username,
      email: found.user.email,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    await ensureDatabase();
    const { token } = await ctx.params;
    const found = await findValidReset(token);
    if (!found) {
      return jsonError("Este enlace no es válido o ya venció", 404);
    }
    const body = resetPasswordSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(body.password, 12);
    const now = new Date().toISOString();
    await db
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, found.user.id));
    await db
      .update(passwordResets)
      .set({ usedAt: now })
      .where(eq(passwordResets.id, found.row.id));
    return jsonOk({ notice: "Contraseña actualizada. Ya puedes iniciar sesión." });
  } catch (error) {
    return handleRouteError(error);
  }
}
