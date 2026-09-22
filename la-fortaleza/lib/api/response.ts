import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/request";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details: details ?? null },
    { status },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof ZodError) {
    return jsonError("Datos inválidos", 400, error.flatten());
  }
  console.error(error);
  return jsonError("Error interno del servidor", 500);
}
