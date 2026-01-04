import React, { memo, useState } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';

const CHUNK_TYPES = [
  { id: 'procedure', label: 'Procedure', color: '#10b981' },
  { id: 'anatomy', label: 'Anatomy', color: '#3b82f6' },
  { id: 'pathology', label: 'Pathology', color: '#f59e0b' },
  { id: 'clinical', label: 'Clinical', color: '#8b5cf6' },
  { id: 'case', label: 'Case', color: '#ec4899' },
  { id: 'general', label: 'General', color: '#6b7280' },
];

const SPECIALTIES = [
  { id: 'skull_base', label: 'Skull Base' },
  { id: 'spine', label: 'Spine' },
  { id: 'vascular', label: 'Vascular' },
  { id: 'functional', label: 'Functional' },
  { id: 'pediatric', label: 'Pediatric' },
  { id: 'tumor', label: 'Tumor' },
  { id: 'trauma', label: 'Trauma' },
];

/**
 * Enhanced search filters with multi-select options
 */
function BrowseFilters({ filters, onChange, documents = [] }) {
  const [expanded, setExpanded] = useState({
    types: true,
    specialty: false,
    quality: false,
    pages: false,
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChunkTypeToggle = (type) => {
    const current = filters.chunk_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onChange({ ...filters, chunk_types: updated.length > 0 ? updated : undefined });
  };

  const handleSpecialtyToggle = (spec) => {
    const current = filters.specialties || [];
    const updated = current.includes(spec)
      ? current.filter(s => s !== spec)
      : [...current, spec];
    onChange({ ...filters, specialties: updated.length > 0 ? updated : undefined });
  };

  const handleClearAll = () => {
    onChange({ limit: filters.limit || 10 });
  };

  // Count active filters
  const activeFilterCount = [
    (filters.chunk_types?.length || 0) > 0,
    (filters.specialties?.length || 0) > 0,
    filters.min_quality > 0,
    filters.min_page || filters.max_page,
    filters.document_ids?.length > 0
  ].filter(Boolean).length;

  return (
    <div className="browse-filters" role="search" aria-label="Browse filters">
      <div className="filter-header">
        <Filter size={16} aria-hidden="true" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="filter-count">{activeFilterCount}</span>
        )}
      </div>

      {/* Results Limit */}
      <div className="filter-group">
        <label htmlFor="filter-limit" className="filter-label">Results</label>
        <select
          id="filter-limit"
          value={filters.limit || 10}
          onChange={(e) => onChange({ ...filters, limit: Number(e.target.value) })}
          className="filter-select"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* Document Filter */}
      {documents.length > 0 && (
        <div className="filter-group">
          <label htmlFor="filter-document" className="filter-label">Document</label>
          <select
            id="filter-document"
            value={filters.document_ids?.[0] || ''}
            onChange={(e) => onChange({
              ...filters,
              document_ids: e.target.value ? [e.target.value] : undefined
            })}
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

      {/* Chunk Type Multi-Select */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('types')}
          aria-expanded={expanded.types}
        >
          <span>Chunk Type</span>
          {(filters.chunk_types?.length || 0) > 0 && (
            <span className="filter-section-count">{filters.chunk_types.length}</span>
          )}
          <ChevronDown
            size={14}
            style={{ transform: expanded.types ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {expanded.types && (
          <div className="filter-checkboxes">
            {CHUNK_TYPES.map(type => (
              <label key={type.id} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={(filters.chunk_types || []).includes(type.id)}
                  onChange={() => handleChunkTypeToggle(type.id)}
                />
                <span
                  className="chunk-type-dot"
                  style={{ backgroundColor: type.color }}
                />
                {type.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Specialty Multi-Select */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('specialty')}
          aria-expanded={expanded.specialty}
        >
          <span>Specialty</span>
          {(filters.specialties?.length || 0) > 0 && (
            <span className="filter-section-count">{filters.specialties.length}</span>
          )}
          <ChevronDown
            size={14}
            style={{ transform: expanded.specialty ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {expanded.specialty && (
          <div className="filter-checkboxes">
            {SPECIALTIES.map(spec => (
              <label key={spec.id} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={(filters.specialties || []).includes(spec.id)}
                  onChange={() => handleSpecialtyToggle(spec.id)}
                />
                {spec.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Quality Threshold */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('quality')}
          aria-expanded={expanded.quality}
        >
          <span>Min Quality</span>
          {filters.min_quality > 0 && (
            <span className="filter-section-value">{Math.round(filters.min_quality * 100)}%</span>
          )}
          <ChevronDown
            size={14}
            style={{ transform: expanded.quality ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {expanded.quality && (
          <div className="filter-slider">
            <input
              type="range"
              min="0"
              max="100"
              value={(filters.min_quality || 0) * 100}
              onChange={(e) => onChange({
                ...filters,
                min_quality: Number(e.target.value) / 100 || undefined
              })}
            />
            <span className="filter-slider-value">{Math.round((filters.min_quality || 0) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Page Range */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('pages')}
          aria-expanded={expanded.pages}
        >
          <span>Page Range</span>
          {(filters.min_page || filters.max_page) && (
            <span className="filter-section-value">
              {filters.min_page || 1}-{filters.max_page || '...'}
            </span>
          )}
          <ChevronDown
            size={14}
            style={{ transform: expanded.pages ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {expanded.pages && (
          <div className="filter-range">
            <input
              type="number"
              min="1"
              placeholder="From"
              value={filters.min_page || ''}
              onChange={(e) => onChange({
                ...filters,
                min_page: e.target.value ? Number(e.target.value) : undefined
              })}
            />
            <span className="filter-range-sep">to</span>
            <input
              type="number"
              min="1"
              placeholder="To"
              value={filters.max_page || ''}
              onChange={(e) => onChange({
                ...filters,
                max_page: e.target.value ? Number(e.target.value) : undefined
              })}
            />
          </div>
        )}
      </div>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <button
          className="filter-clear"
          onClick={handleClearAll}
        >
          <X size={14} />
          Clear All Filters
        </button>
      )}
    </div>
  );
}

export default memo(BrowseFilters);
