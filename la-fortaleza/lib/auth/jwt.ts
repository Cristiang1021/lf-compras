import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/db/schema";

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role: Role;
  fullName: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set and at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AuthTokenPayload): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  return new SignJWT({
    username: payload.username,
    role: payload.role,
    fullName: payload.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  if (!payload.sub || typeof payload.username !== "string") {
    throw new Error("Invalid token payload");
  }
  return {
    sub: payload.sub,
    username: payload.username as string,
    role: payload.role as Role,
    fullName: (payload.fullName as string) || payload.username,
  };
}
