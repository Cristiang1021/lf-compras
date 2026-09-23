export function UmMark({ value }: { value?: string | null }) {
  const um = value?.trim();
  if (!um) return <span className="muted">—</span>;
  return <span className="um-mark">{um}</span>;
}
