import React, { memo } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * @typedef {Object} ConflictBadgeProps
 * @property {number} count - Number of conflicts detected
 * @property {Function} [onClick] - Click handler to expand conflict panel
 */

/**
 * Badge showing conflict count with severity-based coloring
 * - 0 conflicts: Green checkmark
 * - 1-2 conflicts: Yellow warning
 * - 3+ conflicts: Red alert
 *
 * @param {ConflictBadgeProps} props
 */
function ConflictBadge({ count, onClick }) {
  if (count === 0) {
    return (
      <span
        className="conflict-badge conflict-badge-success"
        role="status"
        aria-label="No conflicts detected"
      >
        <CheckCircle size={14} aria-hidden="true" />
        <span>No conflicts</span>
      </span>
    );
  }

  const isHigh = count >= 3;
  const variant = isHigh ? 'error' : 'warning';
  const Icon = isHigh ? AlertCircle : AlertTriangle;

  return (
    <button
      type="button"
      className={`conflict-badge conflict-badge-${variant}`}
      onClick={onClick}
      aria-label={`${count} conflict${count !== 1 ? 's' : ''} detected. Click to view details.`}
      aria-expanded="false"
    >
      <Icon size={14} aria-hidden="true" />
      <span>{count} conflict{count !== 1 ? 's' : ''}</span>
    </button>
  );
}

export default memo(ConflictBadge);
