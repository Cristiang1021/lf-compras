/**
 * Exporta la SQLite local a .sql en orden correcto de FKs
 * (users antes que products) y sin BEGIN/COMMIT/PRAGMA.
 *
 *   npm run db:export-sql
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const src = path.resolve("data/turso-upload/la-fortaleza.db");
const outDir = path.resolve("data/turso-upload");
const desktopDir = path.resolve(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
);

/** Orden seguro: padres antes que hijos */
const TABLE_ORDER = [
  "users",
  "bodegas",
  "products",
  "role_permissions",
  "compra_docs",
  "compra_lineas",
  "transferencia_docs",
  "transferencia_lineas",
  "produccion_docs",
  "produccion_lineas",
] as const;

if (!fs.existsSync(src)) {
  console.error("No existe:", src);
  console.error("Primero: npm run db:prepare-turso");
  process.exit(1);
}

const db = new Database(src, { readonly: true });

const byName = new Map(
  (
    db
      .prepare(
        `SELECT name, sql FROM sqlite_master
         WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
      )
      .all() as { name: string; sql: string }[]
  ).map((t) => [t.name, t]),
);

const indexes = db
  .prepare(
    `SELECT sql FROM sqlite_master
     WHERE type='index' AND sql IS NOT NULL
     ORDER BY name`,
  )
  .all() as { sql: string }[];

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return String(v);
  if (Buffer.isBuffer(v)) return `X'${v.toString("hex")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function tableInserts(name: string): string[] {
  const cols = (
    db.prepare(`PRAGMA table_info("${name}")`).all() as { name: string }[]
  ).map((c) => c.name);
  const rows = db.prepare(`SELECT * FROM "${name}"`).all() as Record<
    string,
    unknown
  >[];
  console.log(`${name}: ${rows.length} filas`);
  return rows.map((row) => {
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const vals = cols.map((c) => sqlLiteral(row[c])).join(", ");
    return `INSERT INTO "${name}" (${colList}) VALUES (${vals});`;
  });
}

const dropOrder = [...TABLE_ORDER].reverse();
const schemaParts: string[] = [
  "-- 1/3 Schema La Fortaleza (ejecutar primero)",
  "",
];

for (const name of dropOrder) {
  if (!byName.has(name)) continue;
  schemaParts.push(`DROP TABLE IF EXISTS "${name}";`);
}
schemaParts.push("");

for (const name of TABLE_ORDER) {
  const t = byName.get(name);
  if (!t) continue;
  schemaParts.push(`${t.sql};`);
  schemaParts.push("");
}

for (const ix of indexes) {
  schemaParts.push(`${ix.sql};`);
}
schemaParts.push("");

const seedParts: string[] = [
  "-- 2/3 Usuarios, bodegas y permisos (ejecutar segundo)",
  "",
];
for (const name of ["users", "bodegas", "role_permissions"] as const) {
  seedParts.push(...tableInserts(name));
  seedParts.push("");
}

const productParts: string[] = [
  "-- 3/3 Productos (ejecutar tercero)",
  "",
  ...tableInserts("products"),
  "",
];

const files = [
  { name: "01-schema.sql", body: schemaParts.join("\n") },
  { name: "02-seed.sql", body: seedParts.join("\n") },
  { name: "03-products.sql", body: productParts.join("\n") },
];

fs.mkdirSync(outDir, { recursive: true });

for (const f of files) {
  const p = path.join(outDir, f.name);
  fs.writeFileSync(p, f.body, "utf8");
  const desk = path.join(desktopDir, `la-fortaleza-${f.name}`);
  try {
    fs.copyFileSync(p, desk);
  } catch {
    // ignore
  }
  console.log(
    `✓ ${f.name} (${(fs.statSync(p).size / 1024).toFixed(1)} KB) → ${p}`,
  );
}

db.close();

console.log("\nOrden en Drizzle Studio / SQL Console:");
console.log("  1) Run 01-schema.sql");
console.log("  2) Run 02-seed.sql");
console.log("  3) Run 03-products.sql");
console.log(
  "\nLos ▶ verdes al lado de cada línea son normales (botón para ejecutar esa sentencia).",
);
