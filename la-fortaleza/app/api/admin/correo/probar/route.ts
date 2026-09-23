import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api/response";
import { ensureDatabase } from "@/lib/db/ensure";
import { sendAppMail } from "@/lib/mail";
import { testMailSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    if (user.role !== "SUPER_USUARIO") {
      return jsonError("Solo el super usuario puede probar el correo", 403);
    }
    const body = testMailSchema.parse(await request.json());
    await sendAppMail({
      to: body.to,
      subject: "Prueba de correo — La Fortaleza",
      text: "Si recibiste este mensaje, el correo saliente de La Fortaleza está funcionando.",
      html: `<p>Si recibiste este mensaje, el correo saliente de <strong>La Fortaleza</strong> está funcionando.</p>`,
    });
    return jsonOk({ sent: true, to: body.to });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo enviar el correo de prueba";
    if (message.includes("correo saliente")) {
      return jsonError(message, 400);
    }
    return handleRouteError(error);
  }
}
