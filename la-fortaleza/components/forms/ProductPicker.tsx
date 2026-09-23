"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { UmMark } from "@/components/ui/UmMark";

export type Product = {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  isActive: boolean;
};

type PageResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function ProductPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (product: Product | null) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      void api<PageResult>(
        `/api/productos?page=1&pageSize=40&q=${encodeURIComponent(q.trim())}`,
      )
        .then((data) => {
          if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    const found = items.find((p) => p.id === value);
    if (found) setSelected(found);
  }, [value, items]);

  return (
    <div className="stack">
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field-label">Buscar producto</label>
        <input
          className="input"
          value={q}
          disabled={disabled}
          placeholder="Escribe código o nombre…"
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="micro">
          {loading ? "Buscando…" : `${items.length} coincidencias`}
        </span>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field-label">Producto</label>
        <select
          className="select"
          disabled={disabled || loading}
          value={value}
          onChange={(e) => {
            const p = items.find((x) => x.id === e.target.value) || null;
            setSelected(p);
            onChange(p);
          }}
        >
          <option value="">— Elegir —</option>
          {items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} — {p.producto} ({p.unidadMedida})
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="news-row" style={{ marginBottom: 0 }}>
          <div style={{ flex: 1 }}>
            <div className="ui-label">Código / unidad (automático)</div>
            <strong>{selected.codigo}</strong>
            <span className="muted"> · </span>
            <UmMark value={selected.unidadMedida} />
          </div>
          <span className="badge-amber">Auto</span>
        </div>
      )}
    </div>
  );
}
