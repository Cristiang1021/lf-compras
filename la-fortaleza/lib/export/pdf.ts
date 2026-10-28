import PDFDocument from "pdfkit";
import { readLogoBuffer } from "./logo";

type PdfColumn = { name: string; money?: boolean };

type PdfTableOpts = {
  title: string;
  sheetHint?: string;
  columns: PdfColumn[];
  rows: Array<Array<string | number | null | undefined>>;
};

const BRAND = "#A21112";
const MONEY_DIGITS = 4;


function cellText(value: string | number | null | undefined, money?: boolean) {
  if (value === null || value === undefined || value === "") return "";
  if (money && typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(MONEY_DIGITS);
  }
  return String(value);
}

export async function buildTablePdf(opts: PdfTableOpts): Promise<Buffer> {
  const landscape = opts.columns.length > 8;
  const doc = new PDFDocument({
    size: "A4",
    layout: landscape ? "landscape" : "portrait",
    margin: 36,
    bufferPages: true,
    info: {
      Title: opts.title,
      Author: "La Fortaleza",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  const logo = readLogoBuffer();
  if (logo) {
    try {
      doc.image(logo, margin, margin - 4, { width: 42, height: 42 });
    } catch (err) {
      console.warn("No se pudo incrustar el logo en PDF:", err);
    }
  }

  doc
    .fillColor(BRAND)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("La Fortaleza", margin + 52, margin, { width: contentWidth - 52 });
  doc
    .fillColor("#444444")
    .font("Helvetica")
    .fontSize(9)
    .text("Control de compras · Transferencias · Producción", margin + 52, margin + 20, {
      width: contentWidth - 52,
    });

  doc
    .moveTo(margin, margin + 48)
    .lineTo(pageWidth - margin, margin + 48)
    .strokeColor(BRAND)
    .lineWidth(1.5)
    .stroke();

  doc
    .fillColor("#111111")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(opts.title, margin, margin + 58, { width: contentWidth, align: "left" });

  const generated = new Date().toLocaleString("es-EC", { hour12: false });
  doc
    .fillColor("#666666")
    .font("Helvetica")
    .fontSize(8)
    .text(`Generado: ${generated}`, margin, margin + 76, {
      width: contentWidth,
      align: "right",
    });

  const colCount = Math.max(opts.columns.length, 1);
  const colWidth = contentWidth / colCount;
  const fontSize = colCount > 10 ? 6.5 : colCount > 8 ? 7 : 8;
  const headerHeight = 22;
  let y = margin + 96;

  function drawHeader() {
    doc.rect(margin, y, contentWidth, headerHeight).fill(BRAND);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(fontSize);
    opts.columns.forEach((col, i) => {
      const x = margin + i * colWidth;
      doc.text(col.name, x + 3, y + 6, {
        width: colWidth - 6,
        height: headerHeight - 8,
        ellipsis: true,
      });
    });
    y += headerHeight;
  }

  function ensureSpace(rowH: number) {
    if (y + rowH <= pageHeight - margin - 24) return;
    doc.addPage();
    y = margin;
    drawHeader();
  }

  drawHeader();

  const dataRows =
    opts.rows.length > 0
      ? opts.rows
      : [opts.columns.map(() => "")];

  doc.font("Helvetica").fontSize(fontSize);
  dataRows.forEach((row, rowIdx) => {
    const texts = opts.columns.map((col, i) => cellText(row[i], col.money));
    let rowH = 14;
    texts.forEach((t) => {
      const h = doc.heightOfString(t || " ", {
        width: colWidth - 6,
        align: "left",
      });
      rowH = Math.max(rowH, Math.min(40, h + 6));
    });

    ensureSpace(rowH);

    if (rowIdx % 2 === 0) {
      doc.rect(margin, y, contentWidth, rowH).fill("#F7F2F2");
    }

    doc.fillColor("#111111").font("Helvetica").fontSize(fontSize);
    texts.forEach((t, i) => {
      const x = margin + i * colWidth;
      doc.text(t, x + 3, y + 3, {
        width: colWidth - 6,
        height: rowH - 4,
        ellipsis: true,
      });
    });

    doc
      .moveTo(margin, y + rowH)
      .lineTo(pageWidth - margin, y + rowH)
      .strokeColor("#DDDDDD")
      .lineWidth(0.5)
      .stroke();

    y += rowH;
  });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .fillColor("#888888")
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Página ${i - range.start + 1} de ${range.count}`,
        margin,
        pageHeight - 28,
        { width: contentWidth, align: "center" },
      );
  }

  doc.end();
  return done;
}

export function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Columnas + filas listas para PDF a partir de los mismos datos del Excel de compra. */
export function compraPdfPayload(
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
  includeMoney: boolean,
) {
  const columns: PdfColumn[] = [
    { name: "N° Reg." },
    { name: "Fecha reg." },
    { name: "Código" },
    { name: "Producto" },
    { name: "Cant." },
    ...(includeMoney
      ? [
          { name: "P. unit.", money: true },
          { name: "M. pedido", money: true },
        ]
      : []),
    { name: "U.M." },
    { name: "F. pedido" },
    { name: "Cant. rec." },
    ...(includeMoney ? [{ name: "M. recib.", money: true }] : []),
    { name: "Proveedor" },
    { name: "F. recepción" },
    { name: "Factura" },
    { name: "Obs." },
  ];
  const data = rows.map((r) => {
    const base: Array<string | number | null | undefined> = [
      r.registro,
      r.fechaRegistro,
      r.codigo,
      r.producto,
      r.cantidad,
    ];
    if (includeMoney) base.push(r.precioUnitario ?? "", r.valorPedido ?? "");
    base.push(r.unidadMedida, r.fechaPedido, r.cantidadRecibida);
    if (includeMoney) base.push(r.valorRecibido ?? "");
    base.push(r.proveedor, r.fechaRecepcion, r.facturaNotaVenta, r.observaciones);
    return base;
  });
  return {
    title: "REQUERIMIENTO DE COMPRA VS RECEPCIÓN",
    columns,
    rows: data,
  };
}

export function transferenciasPdfPayload(
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
  includeMoney: boolean,
) {
  const columns: PdfColumn[] = [
    { name: "N° Reg." },
    { name: "Fecha reg." },
    { name: "Código" },
    { name: "Producto" },
    { name: "Cant." },
    ...(includeMoney
      ? [
          { name: "P. unit.", money: true },
          { name: "Monto", money: true },
        ]
      : []),
    { name: "U.M." },
    { name: "F. transf." },
    { name: "Origen" },
    { name: "Destino" },
    { name: "Obs." },
  ];
  const data = rows.map((r) => {
    const row: Array<string | number | null | undefined> = [
      r.registro,
      r.fechaRegistro,
      r.codigo,
      r.producto,
      r.cantidad,
    ];
    if (includeMoney) row.push(r.precioUnitario ?? "", r.valor ?? "");
    row.push(
      r.unidadMedida,
      r.fechaTransferencia,
      r.origenNombre,
      r.destinoNombre,
      r.observacion,
    );
    return row;
  });
  return { title: "TRANSFERENCIAS", columns, rows: data };
}

export function produccionPdfPayload(
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
  includeMoney: boolean,
) {
  const columns: PdfColumn[] = [
    { name: "N° Reg." },
    { name: "Fecha reg." },
    { name: "Código" },
    { name: "Producto" },
    { name: "Cant." },
    ...(includeMoney
      ? [
          { name: "P. unit.", money: true },
          { name: "Monto", money: true },
        ]
      : []),
    { name: "U.M." },
    { name: "F. prod." },
    { name: "Detalle" },
    { name: "Origen" },
    { name: "Destino" },
    { name: "Obs." },
  ];
  const data = rows.map((r) => {
    const row: Array<string | number | null | undefined> = [
      r.registro,
      r.fechaRegistro,
      r.codigo,
      r.producto,
      r.cantidad,
    ];
    if (includeMoney) row.push(r.precioUnitario ?? "", r.valor ?? "");
    row.push(
      r.unidadMedida,
      r.fechaProduccion,
      r.detalleProduccion,
      r.origenNombre,
      r.destinoNombre,
      r.observaciones,
    );
    return row;
  });
  return { title: "PRODUCCIONES", columns, rows: data };
}

export function productosPdfPayload(
  rows: Array<{
    codigo: string;
    producto: string;
    unidadMedida: string;
    precio?: number | null;
  }>,
  includePrecio: boolean,
) {
  const columns: PdfColumn[] = [
    { name: "Código" },
    { name: "Producto" },
    { name: "U.M." },
    ...(includePrecio ? [{ name: "Precio / UM", money: true }] : []),
  ];
  const data = rows.map((r) => {
    const row: Array<string | number | null | undefined> = [
      r.codigo,
      r.producto,
      r.unidadMedida,
    ];
    if (includePrecio) row.push(r.precio ?? "");
    return row;
  });
  return { title: "MAESTRO DE PRODUCTOS", columns, rows: data };
}
