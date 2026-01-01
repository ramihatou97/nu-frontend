import React, { memo, forwardRef, useId } from 'react';

/**
 * @typedef {Object} InputProps
 * @property {string} [label]
 * @property {string} [error]
 * @property {string} [hint]
 * @property {React.ReactNode} [leftIcon]
 * @property {React.ReactNode} [rightIcon]
 */

/**
 * Accessible input component with label and error states
 * @param {InputProps & React.InputHTMLAttributes<HTMLInputElement>} props
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    className = '',
    id: providedId,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error && errorId, hint && hintId]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {leftIcon && (
          <span className="input-icon input-icon-left" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className="input"
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        {rightIcon && (
          <span className="input-icon input-icon-right" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <span id={errorId} className="input-error-text" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="input-hint">
          {hint}
        </span>
      )}
    </div>
  );
});

export default memo(Input);
