import React, { memo } from 'react';
import { Badge } from '../ui';

/**
 * @typedef {Object} EntityCardProps
 * @property {Object} entity
 * @property {(entity: Object) => void} [onSelect]
 */

const TYPE_COLORS = {
  anatomy: 'info',
  procedure: 'success',
  condition: 'warning',
  medication: 'error',
  device: 'default',
};

/**
 * Entity display card
 * @param {EntityCardProps} props
 */
function EntityCard({ entity, onSelect }) {
  const handleClick = () => onSelect?.(entity);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(entity);
    }
  };

  return (
    <article
      className="entity-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${entity.name}, ${entity.type}`}
    >
      <header className="entity-card-header">
        <h4 className="entity-card-name">{entity.name}</h4>
        <Badge variant={TYPE_COLORS[entity.type] || 'default'} size="sm">
          {entity.type}
        </Badge>
      </header>

      {entity.cui && (
        <span className="entity-card-cui" title="Concept Unique Identifier">
          CUI: {entity.cui}
        </span>
      )}

      {entity.frequency && (
        <span className="entity-card-frequency">
          {entity.frequency} occurrence{entity.frequency !== 1 ? 's' : ''}
        </span>
      )}

      {entity.aliases && entity.aliases.length > 0 && (
        <div className="entity-card-aliases">
          <span className="aliases-label">Also known as:</span>
          <span className="aliases-list">
            {entity.aliases.slice(0, 3).join(', ')}
            {entity.aliases.length > 3 && ` +${entity.aliases.length - 3} more`}
          </span>
        </div>
      )}
    </article>
  );
}

export default memo(EntityCard);
