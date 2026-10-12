"use client";

type Props = {
  canExport: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleAll: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
};

export function ExportToolbar({
  canExport,
  selectedCount,
  totalCount,
  onToggleAll,
  onExportExcel,
  onExportPdf,
}: Props) {
  if (!canExport && totalCount === 0) return null;

  const label =
    selectedCount > 0 ? ` (${selectedCount})` : "";

  return (
    <div className="row" style={{ marginBottom: 10 }}>
      {canExport && (
        <>
          <button type="button" className="btn btn-primary" onClick={onExportExcel}>
            {`Descargar Excel${label}`}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onExportPdf}>
            {`Descargar PDF${label}`}
          </button>
        </>
      )}
      <button type="button" className="btn btn-secondary" onClick={onToggleAll}>
        {selectedCount === totalCount && totalCount > 0
          ? "Quitar selección"
          : "Seleccionar todos"}
      </button>
    </div>
  );
}

export function buildExportUrl(
  base: string,
  selectedIds: string[],
  format: "xlsx" | "pdf",
) {
  const params = new URLSearchParams();
  if (selectedIds.length > 0) params.set("ids", selectedIds.join(","));
  if (format === "pdf") params.set("format", "pdf");
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}
