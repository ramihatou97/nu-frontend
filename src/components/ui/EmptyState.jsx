import React, { memo } from 'react';

/**
 * @typedef {Object} EmptyStateProps
 * @property {React.ReactNode} icon - Icon to display
 * @property {string} title - Title text
 * @property {string} [description] - Description text
 * @property {React.ReactNode} [action] - Action button
 */

/**
 * Empty state placeholder component
 * @param {EmptyStateProps} props
 */
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export default memo(EmptyState);
