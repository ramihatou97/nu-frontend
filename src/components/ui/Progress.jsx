import React, { memo } from 'react';

/**
 * @typedef {Object} ProgressProps
 * @property {number} value - Progress value (0-100)
 * @property {string} [label]
 * @property {boolean} [showValue=true]
 * @property {'default'|'success'|'warning'|'error'} [variant='default']
 */

/**
 * Accessible progress bar component
 * @param {ProgressProps} props
 */
function Progress({
  value,
  label,
  showValue = true,
  variant = 'default',
  className = '',
}) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`progress-container ${className}`}>
      {label && <span className="progress-label">{label}</span>}
      <div
        className={`progress progress-${variant}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${clampedValue}%`}
      >
        <div
          className="progress-bar"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showValue && (
        <span className="progress-value" aria-hidden="true">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}

export default memo(Progress);
