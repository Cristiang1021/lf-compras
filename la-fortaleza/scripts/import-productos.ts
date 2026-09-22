/**
 * Importa productos desde el Excel "Control LA FORTALEZA.xlsx" (hoja Maestro Productos).
 *
 * Uso:
 *   npm run db:import-productos -- "C:\ruta\Control LA FORTALEZA.xlsx"
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { ensureDatabase } from "../lib/db/ensure";
import { products, users } from "../lib/db/schema";

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Falta ruta al Excel");
    process.exit(1);
  }
  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error("No existe:", filePath);
    process.exit(1);
  }

  await ensureDatabase();
  const admin = await db.query.users.findFirst({
    where: eq(users.role, "SUPER_USUARIO"),
  });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
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
  let skipped = 0;

  for (let rowNumber = 1; rowNumber <= ws.rowCount; rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    const codigo = String(row.getCell(1).text || "").trim();
    const producto = String(row.getCell(2).text || "").trim();
    const unidadMedida = String(row.getCell(3).text || "").trim();
    if (!codigo || !producto || !unidadMedida) continue;
    const lower = codigo.toLowerCase();
    if (lower === "código" || lower === "codigo") continue;

    const exists = await db.query.products.findFirst({
      where: eq(products.codigo, codigo),
    });
    if (exists) {
      skipped += 1;
      continue;
    }

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

  console.log(`Importados: ${inserted} | Ya existían: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
