/** Día operativo del restaurante (Ecuador). */
const TIMEZONE = "America/Guayaquil";

/** Fecha de hoy en YYYY-MM-DD, zona America/Guayaquil. */
export function todayISODate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
