import React, { memo } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * @typedef {Object} AlertProps
 * @property {'info'|'success'|'warning'|'error'} [variant='info']
 * @property {string} [title]
 * @property {React.ReactNode} children
 * @property {() => void} [onDismiss]
 */

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * Alert banner component
 * @param {AlertProps} props
 */
function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) {
  const Icon = ICONS[variant];

  return (
    <div
      className={`alert alert-${variant} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <Icon className="alert-icon" size={20} aria-hidden="true" />
      <div className="alert-content">
        {title && <strong className="alert-title">{title}</strong>}
        <span className="alert-message">{children}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="alert-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default memo(Alert);
