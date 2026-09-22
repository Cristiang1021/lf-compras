import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.argv[2] || "./data/la-fortaleza.db");
const db = new Database(dbPath, { readonly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all() as { name: string }[];

console.log("DB:", dbPath);
console.log(
  "tables:",
  tables.map((t) => t.name).join(", "),
);

for (const name of [
  "users",
  "products",
  "bodegas",
  "role_permissions",
  "compra_docs",
  "transferencia_docs",
  "produccion_docs",
]) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as c FROM ${name}`).get() as {
      c: number;
    };
    console.log(`${name}: ${row.c}`);
  } catch {
    console.log(`${name}: (no existe)`);
  }
}

db.close();
