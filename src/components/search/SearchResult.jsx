import React, { memo } from 'react';
import { FileText } from 'lucide-react';
import { highlightText, truncate } from '../../utils/helpers';

/**
 * @typedef {Object} SearchResultProps
 * @property {Object} result - Search result data
 * @property {string} query - Search query for highlighting
 * @property {(result: Object) => void} [onSelect]
 */

/**
 * Single search result item
 * @param {SearchResultProps} props
 */
function SearchResult({ result, query, onSelect }) {
  const handleClick = () => {
    onSelect?.(result);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(result);
    }
  };

  return (
    <article
      className="search-result"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Search result from ${result.document_title || 'document'}`}
    >
      <header className="search-result-header">
        <FileText size={16} aria-hidden="true" />
        <span className="search-result-source">
          {result.document_title || 'Untitled'}
        </span>
        {result.page_start != null && (
          <span className="search-result-page">Page {result.page_start}</span>
        )}
        <span className="search-result-score" aria-label={`Relevance score: ${((result.final_score || 0) * 100).toFixed(0)}%`}>
          {((result.final_score || 0) * 100).toFixed(0)}%
        </span>
      </header>

      <p
        className="search-result-content"
        dangerouslySetInnerHTML={{
          __html: highlightText(truncate(result.content, 300), query),
        }}
      />

      {result.entity_names?.length > 0 && (
        <footer className="search-result-entities">
          {result.entity_names.slice(0, 5).map((name, i) => (
            <span key={i} className="entity-tag">
              {name}
            </span>
          ))}
        </footer>
      )}
    </article>
  );
}

export default memo(SearchResult);
