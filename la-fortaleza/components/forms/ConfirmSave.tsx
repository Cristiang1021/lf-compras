"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export function ConfirmSaveModal({
  open,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-scrim" role="dialog" aria-modal>
      <div className="modal-card">
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>
          Confirmar guardado
        </h2>
        <p className="body-md" style={{ marginTop: 0 }}>
          ¿Confirmas guardar? Revisa que la información sea correcta antes de
          continuar.
        </p>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Guardando…" : "Confirmar y guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmSubmit(onSubmit: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestConfirm(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setOpen(true);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return {
    open,
    busy,
    error,
    setError,
    requestConfirm,
    confirm,
    cancel: () => setOpen(false),
    Modal: (
      <ConfirmSaveModal
        open={open}
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => void confirm()}
      />
    ) as ReactNode,
  };
}
