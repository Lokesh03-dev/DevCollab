import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, className = '' }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const autofocusElement = dialogRef.current?.querySelector('[autofocus]');
    const firstFocusable = dialogRef.current?.querySelector(focusableSelector);
    (autofocusElement || firstFocusable || dialogRef.current)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll(focusableSelector) || [])];
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#14211c]/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section aria-labelledby="modal-title" aria-modal="true" className={`animate-lift-in w-full max-w-lg rounded-xl border border-[#e1e7e1] bg-white p-6 shadow-2xl ${className}`} ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-[#202a27]" id="modal-title">{title}</h2>
          <button aria-label="Close dialog" className="grid size-8 shrink-0 place-items-center rounded-md text-xl leading-none text-[#738078] hover:bg-[#f1f4f1] hover:text-[#202a27]" onClick={onClose} type="button">&times;</button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}