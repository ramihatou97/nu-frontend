import React, { memo } from 'react';

/**
 * @typedef {Object} BadgeProps
 * @property {'default'|'success'|'warning'|'error'|'info'} [variant='default']
 * @property {'sm'|'md'} [size='md']
 * @property {React.ReactNode} children
 */

/**
 * Badge component for status indicators
 * @param {BadgeProps & React.HTMLAttributes<HTMLSpanElement>} props
 */
function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) {
  return (
    <span
      className={`badge badge-${variant} badge-${size} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default memo(Badge);
