import { randomUUID } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { passwordResets, users } from "@/lib/db/schema";
import {
  appBaseUrl,
  hashInviteToken,
  inviteExpiryIso,
  newInviteToken,
  resetPasswordEmailContent,
  sendAppMail,
} from "@/lib/mail";
import { recoverPasswordSchema } from "@/lib/validators";

export const runtime = "nodejs";

const GENERIC =
  "Si el usuario o correo está registrado y tiene email, te enviamos un enlace.";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = recoverPasswordSchema.parse(await request.json());
    const identifier = body.identifier.trim();
    const asEmail = identifier.toLowerCase();

    const user = await db.query.users.findFirst({
      where: or(eq(users.username, identifier), eq(users.email, asEmail)),
    });

    if (user?.isActive && user.email) {
      await db
        .update(passwordResets)
        .set({ usedAt: new Date().toISOString() })
        .where(
          and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)),
        );

      const token = newInviteToken();
      await db.insert(passwordResets).values({
        id: randomUUID(),
        userId: user.id,
        tokenHash: hashInviteToken(token),
        expiresAt: inviteExpiryIso(2),
      });

      const resetUrl = `${appBaseUrl(request)}/recuperar/${token}`;
      const content = resetPasswordEmailContent({
        fullName: user.fullName,
        resetUrl,
      });
      try {
        await sendAppMail({
          to: user.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo enviar el correo";
        return jsonError(message, 400);
      }
    }

    return jsonOk({ notice: GENERIC });
  } catch (error) {
    return handleRouteError(error);
  }
}
