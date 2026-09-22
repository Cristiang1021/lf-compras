import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { ensureDatabase } from "../lib/db/ensure";
import {
  bodegas,
  COMPRA_FIELDS,
  MODULES,
  PRODUCCION_FIELDS,
  PRODUCTO_FIELDS,
  ROLES,
  rolePermissions,
  TRANSFERENCIA_FIELDS,
  users,
  type FieldAccessMap,
  type ModuleKey,
  type Role,
} from "../lib/db/schema";

function allFieldsTrue(keys: readonly string[]): FieldAccessMap {
  return Object.fromEntries(keys.map((k) => [k, true]));
}

function defaultFieldAccess(module: ModuleKey): FieldAccessMap {
  switch (module) {
    case "productos":
      return allFieldsTrue(PRODUCTO_FIELDS);
    case "compra_recepcion":
      return allFieldsTrue(COMPRA_FIELDS);
    case "transferencias":
      return allFieldsTrue(TRANSFERENCIA_FIELDS);
    case "produccion":
      return allFieldsTrue(PRODUCCION_FIELDS);
    default:
      return {};
  }
}

/** Baseline: operational roles can read/create/export; compra también update (recepción). */
function baselinePerm(role: Role, module: ModuleKey) {
  const isSuper = role === "SUPER_USUARIO";
  const isAdminModule = module === "usuarios" || module === "permisos";

  if (isSuper) {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canExport: true,
      fieldAccess: defaultFieldAccess(module),
    };
  }

  if (isAdminModule) {
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
    canRead: true,
    canCreate: module !== "bodegas",
    canUpdate: module === "compra_recepcion",
    canDelete: false,
    canExport: true,
    fieldAccess: defaultFieldAccess(module),
  };
}

async function seed() {
  await ensureDatabase();

  const username = process.env.SEED_SUPER_USERNAME || "admin";
  const password = process.env.SEED_SUPER_PASSWORD || "Admin123!";
  const fullName = process.env.SEED_SUPER_NAME || "Super Usuario";

  let superUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!superUser) {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      id,
      username,
      passwordHash,
      fullName,
      role: "SUPER_USUARIO",
      isActive: true,
    });
    superUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    console.log(`✓ Super usuario creado: ${username}`);
  } else {
    console.log(`• Super usuario ya existe: ${username}`);
  }

  const defaultBodegas = ["Principal", "Compras", "Transito", "Produccion"];
  for (const nombre of defaultBodegas) {
    const exists = await db.query.bodegas.findFirst({
      where: eq(bodegas.nombre, nombre),
    });
    if (!exists) {
      await db.insert(bodegas).values({ id: randomUUID(), nombre, isActive: true });
      console.log(`✓ Bodega: ${nombre}`);
    }
  }

  for (const role of ROLES) {
    for (const module of MODULES) {
      const existing = await db.query.rolePermissions.findFirst({
        where: (rp, { and, eq: e }) =>
          and(e(rp.role, role), e(rp.module, module)),
      });
      if (existing) continue;
      const p = baselinePerm(role, module);
      await db.insert(rolePermissions).values({
        id: randomUUID(),
        role,
        module,
        ...p,
      });
    }
  }
  console.log("✓ Permisos base cargados (editables desde /api/admin/permisos)");

  if (!superUser) throw new Error("No se pudo crear super usuario");

  const demoUsers: Array<{
    username: string;
    password: string;
    fullName: string;
    role: Role;
  }> = [
    {
      username: "admin",
      password: "Admin123!",
      fullName: "Super Usuario",
      role: "SUPER_USUARIO",
    },
    {
      username: "contabilidad",
      password: "Conta123!",
      fullName: "Usuario Contabilidad",
      role: "CONTABILIDAD",
    },
    {
      username: "chef",
      password: "Chef123!",
      fullName: "Usuario Chef",
      role: "CHEF",
    },
    {
      username: "bodega",
      password: "Bodega123!",
      fullName: "Usuario Bodega",
      role: "BODEGA",
    },
  ];

  console.log("\nUsuarios de prueba:");
  for (const demo of demoUsers) {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, demo.username),
    });
    if (existing) {
      // Asegura rol/activo y renueva password conocida de demo
      const passwordHash = await bcrypt.hash(demo.password, 12);
      await db
        .update(users)
        .set({
          passwordHash,
          fullName: demo.fullName,
          role: demo.role,
          isActive: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, existing.id));
      console.log(`  • ${demo.username} / ${demo.password}  (${demo.role}) [actualizado]`);
    } else {
      const passwordHash = await bcrypt.hash(demo.password, 12);
      await db.insert(users).values({
        id: randomUUID(),
        username: demo.username,
        passwordHash,
        fullName: demo.fullName,
        role: demo.role,
        isActive: true,
      });
      console.log(`  ✓ ${demo.username} / ${demo.password}  (${demo.role})`);
    }
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
