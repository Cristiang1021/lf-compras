import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  rolePermissions,
  rolePriceAccess,
  type FieldAccessMap,
  type ModuleKey,
  type Role,
  type User,
} from "@/lib/db/schema";
import { AuthError } from "@/lib/auth/request";

export type PermissionFlags = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  fieldAccess: FieldAccessMap;
};

const SUPER: PermissionFlags = {
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canExport: true,
  fieldAccess: {},
};

export async function getRolePermission(
  role: Role,
  module: ModuleKey,
): Promise<PermissionFlags> {
  if (role === "SUPER_USUARIO") {
    return SUPER;
  }

  const row = await db.query.rolePermissions.findFirst({
    where: and(
      eq(rolePermissions.role, role),
      eq(rolePermissions.module, module),
    ),
  });

  if (!row) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
      fieldAccess: {},
    };
  }

  return {
    canRead: row.canRead,
    canCreate: row.canCreate,
    canUpdate: row.canUpdate,
    canDelete: row.canDelete,
    canExport: row.canExport,
    fieldAccess: row.fieldAccess ?? {},
  };
}

export async function requirePermission(
  user: User,
  module: ModuleKey,
  action: keyof Omit<PermissionFlags, "fieldAccess">,
): Promise<PermissionFlags> {
  const perm = await getRolePermission(user.role, module);
  if (!perm[action]) {
    throw new AuthError(`Sin permiso: ${module}.${action}`, 403);
  }
  return perm;
}

/** Keep only fields the role is allowed to write. Empty fieldAccess = all allowed. */
export function pickAllowedFields<T extends Record<string, unknown>>(
  input: T,
  fieldAccess: FieldAccessMap,
  allowedKeys: readonly string[],
): Partial<T> {
  const hasRestrictions = Object.keys(fieldAccess).length > 0;
  const out: Partial<T> = {};
  for (const key of allowedKeys) {
    if (!(key in input)) continue;
    if (!hasRestrictions || fieldAccess[key] === true) {
      out[key as keyof T] = input[key as keyof T];
    }
  }
  return out;
}

export function assertCanEditLocked(user: User, locked: boolean) {
  if (locked && user.role !== "SUPER_USUARIO") {
    throw new AuthError(
      "El registro está bloqueado. Solo el super usuario puede modificarlo.",
      403,
    );
  }
}

/** Ver precios y montos. Apagado salvo que el rol lo tenga activo en permisos. */
export async function canSeePrecios(user: Pick<User, "role">) {
  const row = await db.query.rolePriceAccess.findFirst({
    where: eq(rolePriceAccess.role, user.role),
  });
  return row?.canSeePrices === true;
}

/** Añadir o quitar productos en una compra abierta. Apagado por defecto. */
export async function canEditOpenCompra(user: Pick<User, "role">) {
  const row = await db.query.rolePriceAccess.findFirst({
    where: eq(rolePriceAccess.role, user.role),
  });
  return row?.canEditOpenCompra === true;
}

export async function redactProductPrecios<T extends { precio?: number | null }>(
  user: Pick<User, "role">,
  row: T,
): Promise<T | Omit<T, "precio">> {
  if (await canSeePrecios(user)) return row;
  const { precio: _p, ...rest } = row;
  return rest;
}
