/**
 * Empuja schema + datos a Turso por API (más fiable que el SQL Console).
 *
 * 1. En Turso → tu BD → Connect → copia URL y token
 * 2. Ponlos en .env:
 *      TURSO_DATABASE_URL=libsql://...
 *      TURSO_AUTH_TOKEN=...
 * 3. npm run db:push-turso
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const src = path.resolve("data/turso-upload/la-fortaleza.db");

if (!url || !authToken) {
  console.error("Falta TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env");
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error("No existe:", src, "→ npm run db:prepare-turso");
  process.exit(1);
}

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

async function main() {
  const local = new Database(src, { readonly: true });
  const remote = createClient({ url: url!, authToken: authToken! });

  const byName = new Map(
    (
      local
        .prepare(
          `SELECT name, sql FROM sqlite_master
           WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        )
        .all() as { name: string; sql: string }[]
    ).map((t) => [t.name, t]),
  );

  const indexes = local
    .prepare(
      `SELECT sql FROM sqlite_master
       WHERE type='index' AND sql IS NOT NULL`,
    )
    .all() as { sql: string }[];

  console.log("Limpiando tablas remotas…");
  for (const name of [...TABLE_ORDER].reverse()) {
    await remote.execute(`DROP TABLE IF EXISTS "${name}"`);
  }

  console.log("Creando tablas…");
  for (const name of TABLE_ORDER) {
    const t = byName.get(name);
    if (!t) continue;
    await remote.execute(t.sql);
  }
  for (const ix of indexes) {
    try {
      await remote.execute(ix.sql);
    } catch {
      // índice ya existe
    }
  }

  for (const name of TABLE_ORDER) {
    const cols = (
      local.prepare(`PRAGMA table_info("${name}")`).all() as { name: string }[]
    ).map((c) => c.name);
    const rows = local.prepare(`SELECT * FROM "${name}"`).all() as Record<
      string,
      unknown
    >[];
    if (rows.length === 0) {
      console.log(`• ${name}: 0`);
      continue;
    }

    const placeholders = cols.map(() => "?").join(", ");
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const sql = `INSERT INTO "${name}" (${colList}) VALUES (${placeholders})`;
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      await remote.batch(
        chunk.map((row) => ({
          sql,
          args: cols.map((c) => {
            const v = row[c];
            if (v === undefined) return null;
            if (typeof v === "boolean") return v ? 1 : 0;
            return v as string | number | null;
          }),
        })),
        "write",
      );
    }
    console.log(`✓ ${name}: ${rows.length}`);
  }

  const check = await remote.execute("SELECT COUNT(*) AS c FROM products");
  console.log("\n✓ Listo en Turso. Productos:", check.rows[0]?.c);
  local.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
