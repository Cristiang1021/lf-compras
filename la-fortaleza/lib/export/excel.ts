import ExcelJS from "exceljs";

type SheetColumn = { name: string; money?: boolean };

type SheetTableOpts = {
  sheetName: string;
  title: string;
  tableName: string;
  columns: SheetColumn[];
  rows: Array<Array<string | number | null | undefined>>;
};

const MONEY_FMT = "0.0000";

function moneyValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  return Math.round(value * 10000) / 10000;
}

async function buildTableWorkbook(opts: SheetTableOpts) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName);

  ws.mergeCells(1, 1, 1, Math.max(opts.columns.length, 1));
  ws.getCell(1, 1).value = opts.title;
  ws.getCell(1, 1).font = { bold: true, size: 14 };

  const dataRows =
    opts.rows.length > 0
      ? opts.rows.map((r) =>
          r.map((v, i) => {
            if (opts.columns[i]?.money) {
              return typeof v === "number" ? moneyValue(v) : "";
            }
            return v === null || v === undefined ? "" : v;
          }),
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
    columns: opts.columns.map((col) => ({
      name: col.name,
      filterButton: true,
      style: col.money ? { numFmt: MONEY_FMT } : undefined,
    })),
    rows: dataRows,
  });

  opts.columns.forEach((col, i) => {
    const column = ws.getColumn(i + 1);
    column.width = Math.min(32, Math.max(14, col.name.length + 4));
    if (col.money) column.numFmt = MONEY_FMT;
  });

  for (let r = 0; r < dataRows.length; r += 1) {
    opts.columns.forEach((col, c) => {
      if (!col.money) return;
      const cell = ws.getCell(4 + r, c + 1);
      if (typeof cell.value === "number") cell.numFmt = MONEY_FMT;
    });
  }

  return wb.xlsx.writeBuffer();
}

export async function exportProductosExcel(
  rows: Array<{
    codigo: string;
    producto: string;
    unidadMedida: string;
    precio?: number | null;
  }>,
  opts?: { includePrecio?: boolean },
) {
  const includePrecio = opts?.includePrecio === true;
  return buildTableWorkbook({
    sheetName: "Maestro Productos",
    title: "MAESTRO DE PRODUCTOS",
    tableName: "TablaProductos",
    columns: includePrecio
      ? [
          { name: "Código" },
          { name: "Producto" },
          { name: "Unidad de medida" },
          { name: "Precio unitario", money: true },
        ]
      : [
          { name: "Código" },
          { name: "Producto" },
          { name: "Unidad de medida" },
        ],
    rows: rows.map((r) =>
      includePrecio
        ? [r.codigo, r.producto, r.unidadMedida, r.precio ?? ""]
        : [r.codigo, r.producto, r.unidadMedida],
    ),
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
    precioUnitario?: number | null;
    valorPedido?: number | null;
    valorRecibido?: number | null;
  }>,
  opts?: { includeMoney?: boolean },
) {
  const money = opts?.includeMoney === true;
  const columns = [
    { name: "N° Registro" },
    { name: "Fecha registro" },
    { name: "Código" },
    { name: "Producto" },
    { name: "Cantidad" },
    ...(money
      ? [
          { name: "Precio unitario", money: true },
          { name: "Monto pedido", money: true },
        ]
      : []),
    { name: "Unidad de medida" },
    { name: "Fecha Pedido" },
    { name: "Cantidad Recibida" },
    ...(money ? [{ name: "Monto recibido", money: true }] : []),
    { name: "Proveedor" },
    { name: "Fecha de Recepción" },
    { name: "Factura/Nota de Venta" },
    { name: "Observaciones" },
  ];
  return buildTableWorkbook({
    sheetName: "Compra VS Recepcion",
    title: "REQUERIMIENTO DE COMPRA VS RECEPCION",
    tableName: "TablaCompraRecepcion",
    columns,
    rows: rows.map((r) => {
      const base = [
        r.registro,
        r.fechaRegistro,
        r.codigo,
        r.producto,
        r.cantidad,
      ];
      if (money) base.push(r.precioUnitario ?? "", r.valorPedido ?? "");
      base.push(
        r.unidadMedida,
        r.fechaPedido,
        r.cantidadRecibida,
      );
      if (money) base.push(r.valorRecibido ?? "");
      base.push(
        r.proveedor,
        r.fechaRecepcion,
        r.facturaNotaVenta,
        r.observaciones,
      );
      return base;
    }),
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
    precioUnitario?: number | null;
    valor?: number | null;
  }>,
  opts?: { includeMoney?: boolean },
) {
  const money = opts?.includeMoney === true;
  return buildTableWorkbook({
    sheetName: "Transferencias",
    title: "TRANSFERENCIAS",
    tableName: "TablaTransferencias",
    columns: [
      { name: "N° Registro" },
      { name: "Fecha registro" },
      { name: "Código" },
      { name: "Producto" },
      { name: "Cantidad" },
      ...(money
        ? [
            { name: "Precio unitario", money: true },
            { name: "Monto", money: true },
          ]
        : []),
      { name: "Unidad de medida" },
      { name: "Fecha TRANSFERENCIA" },
      { name: "Origen" },
      { name: "Destino" },
      { name: "Observacion" },
    ],
    rows: rows.map((r) => {
      const row: Array<string | number | null | undefined> = [
        r.registro,
        r.fechaRegistro,
        r.codigo,
        r.producto,
        r.cantidad,
      ];
      if (money) row.push(r.precioUnitario ?? "", r.valor ?? "");
      row.push(
        r.unidadMedida,
        r.fechaTransferencia,
        r.origenNombre,
        r.destinoNombre,
        r.observacion,
      );
      return row;
    }),
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
    precioUnitario?: number | null;
    valor?: number | null;
  }>,
  opts?: { includeMoney?: boolean },
) {
  const money = opts?.includeMoney === true;
  return buildTableWorkbook({
    sheetName: "PRODUCCION",
    title: "PRODUCCIONES",
    tableName: "TablaProduccion",
    columns: [
      { name: "N° Registro" },
      { name: "Fecha registro" },
      { name: "Código" },
      { name: "Producto" },
      { name: "Cantidad" },
      ...(money
        ? [
            { name: "Precio unitario", money: true },
            { name: "Monto", money: true },
          ]
        : []),
      { name: "Unidad de medida" },
      { name: "Fecha PRODUCCION" },
      { name: "Detalle de Produccion" },
      { name: "Origen" },
      { name: "Destino" },
      { name: "Observaciones" },
    ],
    rows: rows.map((r) => {
      const row: Array<string | number | null | undefined> = [
        r.registro,
        r.fechaRegistro,
        r.codigo,
        r.producto,
        r.cantidad,
      ];
      if (money) row.push(r.precioUnitario ?? "", r.valor ?? "");
      row.push(
        r.unidadMedida,
        r.fechaProduccion,
        r.detalleProduccion,
        r.origenNombre,
        r.destinoNombre,
        r.observaciones,
      );
      return row;
    }),
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
