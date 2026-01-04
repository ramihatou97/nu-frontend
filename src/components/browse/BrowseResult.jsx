import React, { memo, useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  Search,
  MessageSquare
} from 'lucide-react';
import { highlightText, truncate } from '../../utils/helpers';

// Chunk type colors (lowercase to match database values)
const CHUNK_TYPE_COLORS = {
  procedure: '#10b981',
  anatomy: '#3b82f6',
  pathology: '#f59e0b',
  clinical: '#8b5cf6',
  case: '#ec4899',
  general: '#6b7280'
};

/**
 * Quality score visualization bar
 */
function QualityBar({ score, label }) {
  const percentage = Math.round((score || 0) * 100);
  return (
    <div className="quality-bar-wrapper" title={`${label}: ${percentage}%`}>
      <div className="quality-bar">
        <div
          className="quality-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Authority stars (1-5 based on authority_score 0-1)
 */
function AuthorityStars({ score }) {
  const stars = Math.round((score || 0.8) * 5);
  return (
    <div className="authority-stars" aria-label={`Authority: ${stars} of 5`}>
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={12}
          fill={i <= stars ? '#f59e0b' : 'none'}
          stroke={i <= stars ? '#f59e0b' : '#6b7280'}
        />
      ))}
    </div>
  );
}

/**
 * Enhanced browse result card with rich metadata
 */
function BrowseResult({ result, query, onSelect, onFindSimilar, onAsk }) {
  const [expanded, setExpanded] = useState(false);

  // Compute aggregate quality score from individual scores
  const qualityScore = (
    (result.readability_score || 0) * 0.25 +
    (result.coherence_score || 0) * 0.40 +
    (result.completeness_score || 0) * 0.35
  );

  // Extract entity names from various possible formats
  const entityNames = result.entity_names ||
    (typeof result.entity_mentions === 'object' && result.entity_mentions !== null
      ? Object.keys(result.entity_mentions)
      : []);

  // Get chunk type (normalize to lowercase to match database)
  const chunkType = (result.chunk_type || 'general').toLowerCase();

  // Get specialty from various formats
  const specialty = typeof result.specialty === 'object' && result.specialty !== null
    ? Object.keys(result.specialty)[0]
    : result.specialty;

  // Get page number from various field names
  const pageNumber = result.page_start ?? result.page_number ?? result.start_page;

  // Get score from various field names
  const score = result.final_score ?? result.score ?? result.similarity ?? 0;

  // Get CUIs/topic tags
  const cuis = result.cuis || result.topic_tags || [];

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
      className="browse-result"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Result from ${result.document_title || 'document'}`}
    >
      {/* Header Row */}
      <header className="browse-result-header">
        <FileText size={16} aria-hidden="true" />
        <span className="browse-result-source">
          {result.document_title || 'Untitled'}
        </span>
        {pageNumber != null && (
          <span className="browse-result-page">Page {pageNumber}</span>
        )}
        <span className="browse-result-score" aria-label={`Match: ${(score * 100).toFixed(0)}%`}>
          {(score * 100).toFixed(0)}% match
        </span>
      </header>

      {/* Type & Specialty Row */}
      <div className="browse-result-meta">
        <span
          className="browse-badge"
          style={{
            backgroundColor: CHUNK_TYPE_COLORS[chunkType] || CHUNK_TYPE_COLORS.GENERAL,
            color: 'white'
          }}
        >
          {chunkType}
        </span>
        {specialty && (
          <span className="browse-badge browse-badge-outline">
            {specialty.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Content Preview */}
      <p
        className="browse-result-content"
        dangerouslySetInnerHTML={{
          __html: highlightText(
            truncate(result.content, expanded ? 1000 : 300),
            query
          ),
        }}
      />

      {/* Quality & Authority Row (collapsible detail) */}
      {expanded && (
        <div className="browse-result-details">
          <div className="quality-section">
            <span className="quality-label">Quality</span>
            <QualityBar score={qualityScore} label="Overall" />
            <span className="quality-value">{Math.round(qualityScore * 100)}%</span>
          </div>

          <div className="quality-breakdown">
            <span title="Readability: Sentence clarity, term definitions">
              R: {(result.readability_score || 0).toFixed(2)}
            </span>
            <span title="Coherence: Logical flow between sentences">
              C: {(result.coherence_score || 0).toFixed(2)}
            </span>
            <span title="Completeness: Self-contained, no dangling refs">
              Comp: {(result.completeness_score || 0).toFixed(2)}
            </span>
          </div>

          <div className="authority-section">
            <span className="authority-label">Source Authority</span>
            <AuthorityStars score={result.authority_score} />
          </div>

          {/* CUIs (UMLS Concepts) */}
          {cuis.length > 0 && (
            <div className="cuis-section">
              <span className="cuis-label">UMLS CUIs</span>
              <div className="cuis-list">
                {cuis.slice(0, 5).map((cui, i) => (
                  <code key={i} className="cui-tag">{cui}</code>
                ))}
                {cuis.length > 5 && (
                  <span className="cuis-more">+{cuis.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* Chunk ID for debugging/reference */}
          {result.chunk_id && (
            <div className="chunk-id-section">
              <span className="chunk-id-label">Chunk ID</span>
              <code className="chunk-id-value">{result.chunk_id}</code>
            </div>
          )}
        </div>
      )}

      {/* Entities Row */}
      {entityNames.length > 0 && (
        <footer className="browse-result-entities">
          {entityNames.slice(0, 6).map((name, i) => (
            <span key={i} className="entity-tag">{name}</span>
          ))}
          {entityNames.length > 6 && (
            <span className="entity-more">+{entityNames.length - 6}</span>
          )}
        </footer>
      )}

      {/* Action Row */}
      <div className="browse-result-actions">
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Less' : 'More'}
        </button>

        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onFindSimilar?.(result);
          }}
          title="Find similar chunks"
        >
          <Search size={14} />
          Similar
        </button>

        <button
          className="action-btn action-btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            onAsk?.(result);
          }}
          title="Ask a question about this chunk"
        >
          <MessageSquare size={14} />
          Ask About
        </button>
      </div>
    </article>
  );
}

export default memo(BrowseResult);
