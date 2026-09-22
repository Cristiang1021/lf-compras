import { handleRouteError, jsonOk } from "@/lib/api/response";
import { ensureDatabase } from "@/lib/db/ensure";
import { useTurso } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabase();
    return jsonOk({
      service: "la-fortaleza-api",
      status: "ok",
      db: useTurso() ? "turso" : "sqlite-local",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
