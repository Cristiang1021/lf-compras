import ExcelJS from "exceljs";

type SheetTableOpts = {
  sheetName: string;
  title: string;
  tableName: string;
  columns: string[];
  rows: Array<Array<string | number | null | undefined>>;
};

async function buildTableWorkbook(opts: SheetTableOpts) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName);

  ws.mergeCells(1, 1, 1, Math.max(opts.columns.length, 1));
  ws.getCell(1, 1).value = opts.title;
  ws.getCell(1, 1).font = { bold: true, size: 14 };

  const dataRows =
    opts.rows.length > 0
      ? opts.rows.map((r) =>
          r.map((v) => (v === null || v === undefined ? "" : v)),
        )
      : [opts.columns.map(() => "")];

  ws.addTable({
    name: opts.tableName,
    ref: "A3",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium9",
      showRowStripes: true,
    },
    columns: opts.columns.map((name) => ({ name, filterButton: true })),
    rows: dataRows,
  });

  opts.columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = Math.min(32, Math.max(14, col.length + 4));
  });

  return wb.xlsx.writeBuffer();
}

export async function exportProductosExcel(
  rows: Array<{ codigo: string; producto: string; unidadMedida: string }>,
) {
  return buildTableWorkbook({
    sheetName: "Maestro Productos",
    title: "MAESTRO DE PRODUCTOS",
    tableName: "TablaProductos",
    columns: ["Código", "Producto", "Unidad de medida"],
    rows: rows.map((r) => [r.codigo, r.producto, r.unidadMedida]),
  });
}

export async function exportCompraExcel(
  rows: Array<{
    registro: string;
    fechaRegistro: string;
    codigo: string;
    producto: string;
    cantidad: number | null;
    unidadMedida: string;
    fechaPedido: string | null;
    cantidadRecibida: number | null;
    proveedor: string | null;
    fechaRecepcion: string | null;
    facturaNotaVenta: string | null;
    observaciones: string | null;
  }>,
) {
  return buildTableWorkbook({
    sheetName: "Compra VS Recepcion",
    title: "REQUERIMIENTO DE COMPRA VS RECEPCION",
    tableName: "TablaCompraRecepcion",
    columns: [
      "N° Registro",
      "Fecha registro",
      "Código",
      "Producto",
      "Cantidad",
      "Unidad de medida",
      "Fecha Pedido",
      "Cantidad Recibida",
      "Proveedor",
      "Fecha de Recepción",
      "Factura/Nota de Venta",
      "Observaciones",
    ],
    rows: rows.map((r) => [
      r.registro,
      r.fechaRegistro,
      r.codigo,
      r.producto,
      r.cantidad,
      r.unidadMedida,
      r.fechaPedido,
      r.cantidadRecibida,
      r.proveedor,
      r.fechaRecepcion,
      r.facturaNotaVenta,
      r.observaciones,
    ]),
  });
}

export async function exportTransferenciasExcel(
  rows: Array<{
    registro: string;
    fechaRegistro: string;
    codigo: string;
    producto: string;
    cantidad: number | null;
    unidadMedida: string;
    fechaTransferencia: string | null;
    origenNombre: string | null;
    destinoNombre: string | null;
    observacion: string | null;
  }>,
) {
  return buildTableWorkbook({
    sheetName: "Transferencias",
    title: "TRANSFERENCIAS",
    tableName: "TablaTransferencias",
    columns: [
      "N° Registro",
      "Fecha registro",
      "Código",
      "Producto",
      "Cantidad",
      "Unidad de medida",
      "Fecha TRANSFERENCIA",
      "Origen",
      "Destino",
      "Observacion",
    ],
    rows: rows.map((r) => [
      r.registro,
      r.fechaRegistro,
      r.codigo,
      r.producto,
      r.cantidad,
      r.unidadMedida,
      r.fechaTransferencia,
      r.origenNombre,
      r.destinoNombre,
      r.observacion,
    ]),
  });
}

export async function exportProduccionExcel(
  rows: Array<{
    registro: string;
    fechaRegistro: string;
    codigo: string;
    producto: string;
    cantidad: number | null;
    unidadMedida: string;
    fechaProduccion: string | null;
    detalleProduccion: string | null;
    origenNombre: string | null;
    destinoNombre: string | null;
    observaciones: string | null;
  }>,
) {
  return buildTableWorkbook({
    sheetName: "PRODUCCION",
    title: "PRODUCCIONES",
    tableName: "TablaProduccion",
    columns: [
      "N° Registro",
      "Fecha registro",
      "Código",
      "Producto",
      "Cantidad",
      "Unidad de medida",
      "Fecha PRODUCCION",
      "Detalle de Produccion",
      "Origen",
      "Destino",
      "Observaciones",
    ],
    rows: rows.map((r) => [
      r.registro,
      r.fechaRegistro,
      r.codigo,
      r.producto,
      r.cantidad,
      r.unidadMedida,
      r.fechaProduccion,
      r.detalleProduccion,
      r.origenNombre,
      r.destinoNombre,
      r.observaciones,
    ]),
  });
}

export function excelResponse(
  buffer: ExcelJS.Buffer | ArrayBuffer | Buffer,
  filename: string,
) {
  return new Response(buffer as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
