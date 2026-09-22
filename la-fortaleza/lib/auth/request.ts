import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type Role, type User } from "@/lib/db/schema";
import { verifyAccessToken, type AuthTokenPayload } from "@/lib/auth/jwt";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function authenticateRequest(request: Request): Promise<{
  token: AuthTokenPayload;
  user: User;
}> {
  const tokenValue = extractBearerToken(request);
  if (!tokenValue) {
    throw new AuthError("Token de autorización requerido");
  }

  let payload: AuthTokenPayload;
  try {
    payload = await verifyAccessToken(tokenValue);
  } catch {
    throw new AuthError("Token inválido o expirado");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });

  if (!user || !user.isActive) {
    throw new AuthError("Usuario inactivo o inexistente", 403);
  }

  return { token: payload, user };
}

export function assertRole(user: User, allowed: Role[]) {
  if (!allowed.includes(user.role)) {
    throw new AuthError("No tienes permiso para esta acción", 403);
  }
}
