import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation popup built on the native <dialog>: focus is trapped and Escape closes it. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-message" data-testid="confirm-dialog"
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
      onClick={(e) => { if (e.target === ref.current && !busy) onCancel(); }}>
      <div className="dialog__body">
        <h2 id="dialog-title">{title}</h2>
        <div id="dialog-message" className="dialog__message">{message}</div>
        <div className="dialog__actions">
          <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy} data-testid="confirm-no">{cancelLabel}</button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy} data-testid="confirm-yes">
            {busy && <span className="spinner" aria-hidden="true" />} {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
