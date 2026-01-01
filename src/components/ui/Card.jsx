import React, { memo } from 'react';

/**
 * @typedef {Object} CardProps
 * @property {React.ReactNode} children
 * @property {string} [title]
 * @property {React.ReactNode} [actions]
 * @property {boolean} [hoverable=false]
 * @property {boolean} [selected=false]
 */

/**
 * Card component with optional header and actions
 * @param {CardProps & React.HTMLAttributes<HTMLDivElement>} props
 */
function Card({
  children,
  title,
  actions,
  hoverable = false,
  selected = false,
  className = '',
  ...props
}) {
  const classes = [
    'card',
    hoverable && 'card-hoverable',
    selected && 'card-selected',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes} aria-selected={selected || undefined} {...props}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-content">{children}</div>
    </article>
  );
}

export default memo(Card);
