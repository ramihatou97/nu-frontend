import React, { memo } from 'react';
import { Filter } from 'lucide-react';

/**
 * @typedef {Object} SearchFiltersProps
 * @property {Object} filters - Current filter values
 * @property {(filters: Object) => void} onChange - Filter change handler
 * @property {Array} documents - Available documents for filtering
 * @property {Array} entityTypes - Available entity types
 */

/**
 * Search filters component
 * @param {SearchFiltersProps} props
 */
function SearchFilters({ filters, onChange, documents = [], entityTypes = [] }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="search-filters" role="search" aria-label="Search filters">
      <div className="filter-header">
        <Filter size={16} aria-hidden="true" />
        <span>Filters</span>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-limit" className="filter-label">
          Results Limit
        </label>
        <select
          id="filter-limit"
          value={filters.limit || 10}
          onChange={(e) => handleChange('limit', Number(e.target.value))}
          className="filter-select"
        >
          <option value={5}>5 results</option>
          <option value={10}>10 results</option>
          <option value={20}>20 results</option>
          <option value={50}>50 results</option>
        </select>
      </div>

      {documents.length > 0 && (
        <div className="filter-group">
          <label htmlFor="filter-document" className="filter-label">
            Document
          </label>
          <select
            id="filter-document"
            value={filters.document_id || ''}
            onChange={(e) => handleChange('document_id', e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Documents</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title || doc.filename}
              </option>
            ))}
          </select>
        </div>
      )}

      {entityTypes.length > 0 && (
        <div className="filter-group">
          <label htmlFor="filter-entity-type" className="filter-label">
            Entity Type
          </label>
          <select
            id="filter-entity-type"
            value={filters.entity_type || ''}
            onChange={(e) => handleChange('entity_type', e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default memo(SearchFilters);
