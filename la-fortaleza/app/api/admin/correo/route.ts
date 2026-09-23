import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure";
import { mailServers } from "@/lib/db/schema";
import { getActiveMailServer, toPublicMailConfig } from "@/lib/mail";
import { mailServerSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    if (user.role !== "SUPER_USUARIO") {
      return jsonError("Solo el super usuario configura el correo saliente", 403);
    }
    const row = await getActiveMailServer();
    return jsonOk(toPublicMailConfig(row));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    if (user.role !== "SUPER_USUARIO") {
      return jsonError("Solo el super usuario configura el correo saliente", 403);
    }

    const body = mailServerSchema.parse(await request.json());
    const existing = await getActiveMailServer();
    const password = body.password?.trim() || existing?.password || "";
    if (!password) {
      return jsonError("La contraseña SMTP es obligatoria", 400);
    }

    const values = {
      name: body.name.trim(),
      fromEmail: body.fromEmail.trim().toLowerCase(),
      fromName: body.fromName?.trim() || "La Fortaleza",
      smtpHost: body.smtpHost.trim(),
      smtpPort: body.smtpPort,
      encryption: body.encryption,
      username: body.username.trim(),
      password,
      isActive: body.isActive ?? true,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await db.update(mailServers).set(values).where(eq(mailServers.id, existing.id));
    } else {
      await db.insert(mailServers).values({ id: randomUUID(), ...values });
    }

    const saved =
      (await getActiveMailServer()) ||
      (
        await db.select().from(mailServers).orderBy(desc(mailServers.updatedAt)).limit(1)
      )[0];
    return jsonOk(toPublicMailConfig(saved ?? null));
  } catch (error) {
    return handleRouteError(error);
  }
}
