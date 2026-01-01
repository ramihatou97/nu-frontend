import React, { memo, useCallback } from 'react';
import { FileText, Trash2, Eye, Download, MoreVertical } from 'lucide-react';
import { formatDate, formatFileSize } from '../../utils/helpers';
import { Badge, Card } from '../ui';

/**
 * @typedef {Object} DocumentCardProps
 * @property {Object} document
 * @property {boolean} [selected]
 * @property {(doc: Object) => void} [onSelect]
 * @property {(docId: string) => void} [onDelete]
 * @property {(docId: string) => void} [onView]
 */

/**
 * Document card component for library grid
 * @param {DocumentCardProps} props
 */
function DocumentCard({ document, selected, onSelect, onDelete, onView }) {
  const handleSelect = useCallback(() => {
    onSelect?.(document);
  }, [document, onSelect]);

  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${document.title || document.filename}"?`)) {
        onDelete?.(document.id);
      }
    },
    [document, onDelete]
  );

  const handleView = useCallback(
    (e) => {
      e.stopPropagation();
      onView?.(document.id);
    },
    [document, onView]
  );

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card
      hoverable
      selected={selected}
      className="document-card"
      onClick={handleSelect}
      aria-selected={selected}
      role="option"
    >
      <div className="document-card-icon" aria-hidden="true">
        <FileText size={32} />
      </div>

      <div className="document-card-content">
        <h3 className="document-card-title">
          {document.title || document.filename}
        </h3>

        <div className="document-card-meta">
          {document.page_count && (
            <span>{document.page_count} pages</span>
          )}
          {document.chunk_count && (
            <span>{document.chunk_count} chunks</span>
          )}
          {document.size && <span>{formatFileSize(document.size)}</span>}
        </div>

        <div className="document-card-footer">
          <Badge variant={getStatusVariant(document.status)} size="sm">
            {document.status || 'Unknown'}
          </Badge>
          <span className="document-card-date">
            {formatDate(document.created_at)}
          </span>
        </div>
      </div>

      <div className="document-card-actions">
        <button
          type="button"
          className="icon-button"
          onClick={handleView}
          aria-label={`View ${document.title || document.filename}`}
        >
          <Eye size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button icon-button-danger"
          onClick={handleDelete}
          aria-label={`Delete ${document.title || document.filename}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </Card>
  );
}

export default memo(DocumentCard);
