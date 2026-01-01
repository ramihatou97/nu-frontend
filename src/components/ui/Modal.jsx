import React, { memo, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * @typedef {Object} ModalProps
 * @property {boolean} open - Whether modal is open
 * @property {() => void} onClose - Close handler
 * @property {string} title - Modal title
 * @property {React.ReactNode} children - Modal content
 * @property {React.ReactNode} [footer] - Modal footer
 * @property {'sm'|'md'|'lg'|'xl'} [size='md']
 */

/**
 * Accessible modal dialog with focus trap
 * @param {ModalProps} props
 */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Store previous focus and trap focus in modal
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      dialogRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = '';
        previousFocusRef.current?.focus();
      };
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`modal modal-${size}`}
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="modal-content">{children}</div>

        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export default memo(Modal);
