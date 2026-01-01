import React, { memo, forwardRef } from 'react';

/**
 * @typedef {Object} ButtonProps
 * @property {'primary'|'secondary'|'danger'|'ghost'} [variant='primary']
 * @property {'sm'|'md'|'lg'} [size='md']
 * @property {boolean} [loading=false]
 * @property {boolean} [disabled=false]
 * @property {React.ReactNode} [icon]
 * @property {React.ReactNode} children
 */

/**
 * Accessible button component
 * @param {ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    children,
    className = '',
    ...props
  },
  ref
) {
  const baseClass = 'btn';
  const classes = [
    baseClass,
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="btn-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="btn-text">{children}</span>
    </button>
  );
});

export default memo(Button);
