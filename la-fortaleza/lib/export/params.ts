export function parseExportIds(request: Request): string[] {
  const idsParam = new URL(request.url).searchParams.get("ids")?.trim();
  if (!idsParam) return [];
  return idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseExportFormat(request: Request): "xlsx" | "pdf" {
  const format = new URL(request.url).searchParams.get("format")?.trim().toLowerCase();
  return format === "pdf" ? "pdf" : "xlsx";
}
