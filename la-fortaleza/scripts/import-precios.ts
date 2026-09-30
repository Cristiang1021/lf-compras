/**
 * Actualiza precio solo en productos cuyo código ya existe.
 * No crea productos. El resto del maestro queda sin precio.
 *
 * Uso:
 *   npm run db:import-precios
 *   npm run db:import-precios -- "precios_a_subir.csv"
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { ensureDatabase } from "../lib/db/ensure";
import { products } from "../lib/db/schema";

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: Array<{ codigo: string; precio: number; raw: string }> = [];
  for (const line of lines) {
    const [codigoRaw, precioRaw] = line.split(",");
    const codigo = (codigoRaw ?? "").trim();
    const raw = (precioRaw ?? "").trim().replace(",", ".");
    if (!codigo || codigo.toLowerCase() === "codigo_producto") continue;
    const precio = Number(raw);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error(`Precio inválido en ${codigo}: ${precioRaw}`);
    }
    rows.push({ codigo, precio: round4(precio), raw });
  }
  return rows;
}

async function main() {
  const fileArg = process.argv[2];
  const filePath = path.resolve(
    fileArg || path.join(process.cwd(), "precios_a_subir.csv"),
  );
  if (!fs.existsSync(filePath)) {
    console.error("No existe:", filePath);
    process.exit(1);
  }
  if (!filePath.toLowerCase().endsWith(".csv")) {
    console.error("Este import espera un CSV codigo_producto,precio");
    process.exit(1);
  }

  await ensureDatabase();
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));

  const updated: string[] = [];
  const missing: string[] = [];

  for (const row of rows) {
    const existing = await db.query.products.findFirst({
      where: eq(products.codigo, row.codigo),
    });
    if (!existing || !existing.isActive) {
      missing.push(row.codigo);
      continue;
    }
    await db
      .update(products)
      .set({ precio: row.precio, updatedAt: new Date().toISOString() })
      .where(eq(products.id, existing.id));
    updated.push(`${row.codigo} ${row.precio.toFixed(4)}`);
  }

  console.log(`Actualizados: ${updated.length}`);
  for (const line of updated) console.log("  ", line);
  console.log(`Sin match (no se crearon): ${missing.length}`);
  for (const codigo of missing) console.log("  ", codigo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
