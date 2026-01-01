import React, { memo } from 'react';

/**
 * @typedef {Object} SpinnerProps
 * @property {'sm'|'md'|'lg'} [size='md']
 * @property {string} [label='Loading']
 */

/**
 * Accessible loading spinner
 * @param {SpinnerProps} props
 */
function Spinner({ size = 'md', label = 'Loading' }) {
  return (
    <div
      className={`spinner spinner-${size}`}
      role="status"
      aria-label={label}
    >
      <span className="spinner-icon" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default memo(Spinner);
