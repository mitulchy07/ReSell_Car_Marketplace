import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/** One accessible confirmation pattern for auth, bookings, seller and admin actions. */
export default function ConfirmDialog({
  open,
  title,
  description,
  subject,
  confirmLabel = 'Confirm action',
  cancelLabel = 'Cancel',
  tone = 'normal',
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const currentState = useRef({ busy, onCancel });
  currentState.current = { busy, onCancel };

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        if (!currentState.current.busy) {
          event.preventDefault();
          currentState.current.onCancel?.();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey);
      if (previouslyFocused.current?.isConnected) previouslyFocused.current.focus();
    };
  }, [open]);

  if (!open) return null;
  const isDanger = tone === 'danger';
  const isSignOut = tone === 'signout';
  const buttonText = busy ? (isSignOut ? 'Signing out…' : 'Processing…') : confirmLabel;
  return createPortal(
    <div
      className="rs-ui-dialog-backdrop rs-fix-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <section
        ref={dialogRef}
        className={`rs-ui-dialog rs-fix-dialog ${isSignOut ? 'rs-ui-dialog--signout' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
      >
        <button
          type="button"
          className="rs-ui-dialog-x rs-fix-close"
          aria-label="Close without confirming"
          disabled={busy}
          onClick={onCancel}
        >
          ×
        </button>
        <div
          className={`rs-ui-dialog-symbol rs-fix-symbol ${isDanger ? 'is-danger' : isSignOut ? 'is-signout' : 'is-normal'}`}
          aria-hidden="true"
        >
          {isDanger ? '!' : isSignOut ? '↪' : '✓'}
        </div>
        <p className="rs-ui-dialog-eyebrow">CONFIRM YOUR CHOICE</p>
        <h2 id={titleId}>{title || 'Please confirm'}</h2>
        <p id={descriptionId} className="rs-ui-dialog-description">
          {description || 'Please review the action before proceeding.'}
        </p>
        {subject && <div className="rs-ui-dialog-subject">{subject}</div>}
        {error && (
          <p className="rs-ui-dialog-error" role="alert">
            {error}
          </p>
        )}
        <div
          className="rs-ui-dialog-actions rs-fix-actions"
          role="group"
          aria-label="Choose whether to proceed"
        >
          <button
            ref={cancelRef}
            type="button"
            className="rs-ui-dialog-cancel rs-fix-cancel"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rs-ui-dialog-confirm rs-fix-confirm ${isDanger ? 'is-danger' : ''} ${isSignOut ? 'rs-ui-dialog-confirm--signout' : ''}`}
            disabled={busy}
            onClick={onConfirm}
            aria-label={confirmLabel}
          >
            <span className="rs-fix-confirm-text">{buttonText}</span>
            {!busy && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
