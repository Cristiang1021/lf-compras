/**
 * Genera un SQLite listo para subir a Turso (Upload SQLite File):
 * tablas + seed + productos del Excel.
 *
 * Uso:
 *   npm run db:prepare-turso -- "C:\ruta\Control LA FORTALEZA.xlsx"
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";

const excelArg = process.argv[2];
const excelDefault =
  "c:/Users/crist/Downloads/Telegram Desktop/Control LA FORTALEZA.xlsx";
const excelPath = path.resolve(excelArg || excelDefault);

if (!fs.existsSync(excelPath)) {
  console.error("No se encontró el Excel:", excelPath);
  process.exit(1);
}

const outDir = path.resolve("data/turso-upload");
const outDb = path.join(outDir, "la-fortaleza.db");
const desktopCopy = path.join(
  process.env.USERPROFILE || "",
  "Desktop",
  "la-fortaleza-turso.db",
);

fs.mkdirSync(outDir, { recursive: true });
for (const f of [outDb, `${outDb}-wal`, `${outDb}-shm`, `${outDb}-journal`]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// Apunta el ORM a este archivo ANTES de importarlo
process.env.DATABASE_URL = `file:${outDb.replace(/\\/g, "/")}`;
process.env.USE_TURSO = "false";

async function main() {
  const { ensureDatabase } = await import("../lib/db/ensure");
  const { db } = await import("../lib/db");
  const schema = await import("../lib/db/schema");
  const {
    bodegas,
    COMPRA_FIELDS,
    MODULES,
    PRODUCCION_FIELDS,
    PRODUCTO_FIELDS,
    ROLES,
    rolePermissions,
    TRANSFERENCIA_FIELDS,
    users,
    products,
  } = schema;
  const { eq } = await import("drizzle-orm");

  type FieldAccessMap = import("../lib/db/schema").FieldAccessMap;
  type ModuleKey = import("../lib/db/schema").ModuleKey;
  type Role = import("../lib/db/schema").Role;

  await ensureDatabase();
  console.log("✓ Tablas creadas");

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

  const demos: Array<{
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

  for (const demo of demos) {
    const passwordHash = await bcrypt.hash(demo.password, 12);
    await db.insert(users).values({
      id: randomUUID(),
      username: demo.username,
      passwordHash,
      fullName: demo.fullName,
      role: demo.role,
      isActive: true,
    });
    console.log(`✓ Usuario ${demo.username} / ${demo.password}`);
  }

  for (const nombre of ["Principal", "Compras", "Transito", "Produccion"]) {
    await db.insert(bodegas).values({
      id: randomUUID(),
      nombre,
      isActive: true,
    });
  }
  console.log("✓ Bodegas");

  for (const role of ROLES) {
    for (const module of MODULES) {
      const p = baselinePerm(role, module);
      await db.insert(rolePermissions).values({
        id: randomUUID(),
        role,
        module,
        ...p,
      });
    }
  }
  console.log("✓ Permisos");

  const admin = await db.query.users.findFirst({
    where: eq(users.role, "SUPER_USUARIO"),
  });

  console.log("Importando productos desde:", excelPath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const ws =
    wb.getWorksheet("Maestro Productos") ??
    wb.worksheets.find((s) =>
      String(s.name).toLowerCase().includes("producto"),
    );
  if (!ws) {
    console.error("No se encontró la hoja Maestro Productos");
    process.exit(1);
  }

  let inserted = 0;
  const seen = new Set<string>();
  for (let rowNumber = 1; rowNumber <= ws.rowCount; rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    const codigo = String(row.getCell(1).text || "").trim();
    const producto = String(row.getCell(2).text || "").trim();
    const unidadMedida = String(row.getCell(3).text || "").trim();
    if (!codigo || !producto || !unidadMedida) continue;
    const lower = codigo.toLowerCase();
    if (lower === "código" || lower === "codigo") continue;
    if (seen.has(codigo)) continue;
    seen.add(codigo);

    await db.insert(products).values({
      id: randomUUID(),
      codigo,
      producto,
      unidadMedida,
      createdBy: admin?.id ?? null,
      isActive: true,
    });
    inserted += 1;
  }
  console.log(`✓ Productos importados: ${inserted}`);

  for (const suffix of ["-wal", "-shm", "-journal"]) {
    const f = `${outDb}${suffix}`;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  try {
    fs.copyFileSync(outDb, desktopCopy);
  } catch {
    // ignore
  }

  const stats = new Database(outDb, { readonly: true });
  const counts = {
    products: (
      stats.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number }
    ).c,
    users: (
      stats.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }
    ).c,
    bodegas: (
      stats.prepare("SELECT COUNT(*) as c FROM bodegas").get() as { c: number }
    ).c,
    perms: (
      stats.prepare("SELECT COUNT(*) as c FROM role_permissions").get() as {
        c: number;
      }
    ).c,
  };
  stats.close();

  console.log("\n✓ Base lista para Turso");
  console.log(`  Archivo: ${outDb}`);
  if (fs.existsSync(desktopCopy)) console.log(`  Copia:   ${desktopCopy}`);
  console.log(
    `  Productos: ${counts.products} | Usuarios: ${counts.users} | Bodegas: ${counts.bodegas} | Permisos: ${counts.perms}`,
  );
  console.log(
    "\nEn Turso → Create Database → Upload SQLite File → elige ese .db",
  );
  console.log("Nombre sugerido: la-fortaleza");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
