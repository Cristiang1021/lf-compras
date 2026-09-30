const SCALE = 10000;

/** Redondeo monetario fijo a 4 decimales. */
export function round4(n: number) {
  return Math.round(n * SCALE) / SCALE;
}

/** Precio × cantidad, redondeado a 4 decimales. Null si falta precio o cantidad. */
export function monto(
  cantidad: number | null | undefined,
  precio: number | null | undefined,
): number | null {
  if (cantidad == null || precio == null) return null;
  if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) return null;
  return round4(cantidad * precio);
}

export function sumMontos(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round4(nums.reduce((a, b) => a + b, 0));
}

/** Siempre 4 decimales: 1.763 → 1,7630 */
export function formatMonto(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const [entero, frac] = round4(value).toFixed(4).split(".");
  const grouped = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${frac}`;
}
