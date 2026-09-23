import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { invitations, users } from "@/lib/db/schema";
import {
  appBaseUrl,
  hashInviteToken,
  inviteEmailContent,
  inviteExpiryIso,
  newInviteToken,
  sendAppMail,
} from "@/lib/mail";
import { requirePermission } from "@/lib/permissions";
import { inviteUserSchema } from "@/lib/validators";
import { roleLabel } from "@/lib/client/labels";

export const runtime = "nodejs";

function publicInvite(row: typeof invitations.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.fullName,
    status: row.status,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "usuarios", "canRead");
    const rows = await db
      .select()
      .from(invitations)
      .orderBy(desc(invitations.createdAt));
    return jsonOk(rows.map(publicInvite));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    await requirePermission(user, "usuarios", "canCreate");
    const body = inviteUserSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const fullName = body.fullName?.trim() || null;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      return jsonError("Ya existe un usuario con ese correo", 409);
    }

    const pending = await db.query.invitations.findFirst({
      where: and(eq(invitations.email, email), eq(invitations.status, "pendiente")),
    });

    const token = newInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = inviteExpiryIso(72);
    let inviteId = pending?.id ?? randomUUID();

    if (pending) {
      await db
        .update(invitations)
        .set({
          role: body.role,
          fullName,
          tokenHash,
          expiresAt,
          invitedBy: user.id,
        })
        .where(eq(invitations.id, pending.id));
    } else {
      await db.insert(invitations).values({
        id: inviteId,
        email,
        role: body.role,
        fullName,
        tokenHash,
        status: "pendiente",
        invitedBy: user.id,
        expiresAt,
      });
    }

    const inviteUrl = `${appBaseUrl(request)}/invitar/${token}`;
    const content = inviteEmailContent({
      roleLabel: roleLabel(body.role),
      inviteUrl,
      invitedName: fullName,
    });

    try {
      await sendAppMail({
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo enviar el correo";
      return jsonError(message, 400);
    }

    const saved = await db.query.invitations.findFirst({
      where: eq(invitations.id, inviteId),
    });
    return jsonOk(
      {
        ...publicInvite(saved!),
        notice: pending
          ? "Invitación reenviada al correo."
          : "Invitación enviada al correo.",
      },
      { status: pending ? 200 : 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
