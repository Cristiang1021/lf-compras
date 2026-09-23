import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { invitations, users } from "@/lib/db/schema";
import { hashInviteToken } from "@/lib/mail";
import { acceptInviteSchema } from "@/lib/validators";
import { roleLabel } from "@/lib/client/labels";

export const runtime = "nodejs";

async function findPendingInvite(token: string) {
  const tokenHash = hashInviteToken(token);
  return db.query.invitations.findFirst({
    where: and(
      eq(invitations.tokenHash, tokenHash),
      eq(invitations.status, "pendiente"),
    ),
  });
}

function isExpired(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    await ensureDatabase();
    const { token } = await ctx.params;
    const invite = await findPendingInvite(token);
    if (!invite || isExpired(invite.expiresAt)) {
      return jsonError("Esta invitación no es válida o ya venció", 404);
    }
    return jsonOk({
      email: invite.email,
      role: invite.role,
      roleLabel: roleLabel(invite.role),
      fullName: invite.fullName,
      expiresAt: invite.expiresAt,
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
    const invite = await findPendingInvite(token);
    if (!invite || isExpired(invite.expiresAt)) {
      return jsonError("Esta invitación no es válida o ya venció", 404);
    }

    const body = acceptInviteSchema.parse(await request.json());
    const username = body.username.trim();
    const fullName = body.fullName.trim();

    const usernameTaken = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (usernameTaken) {
      return jsonError("Ese nombre de usuario ya existe", 409);
    }

    const emailTaken = await db.query.users.findFirst({
      where: eq(users.email, invite.email),
    });
    if (emailTaken) {
      return jsonError("Ya existe una cuenta con este correo", 409);
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);
    await db.insert(users).values({
      id,
      username,
      passwordHash,
      fullName,
      email: invite.email,
      role: invite.role,
      isActive: true,
    });

    await db
      .update(invitations)
      .set({
        status: "aceptada",
        acceptedAt: new Date().toISOString(),
        fullName,
      })
      .where(eq(invitations.id, invite.id));

    return jsonOk({
      username,
      notice: "Cuenta creada. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
