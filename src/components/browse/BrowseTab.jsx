import React, { memo, useCallback, useState, useMemo } from 'react';
import { Compass } from 'lucide-react';
import BrowseResult from './BrowseResult';
import BrowseFilters from './BrowseFilters';
import { useSearch, useDocuments } from '../../hooks/useApi';
import { useVirtualList } from '../../hooks/useVirtualList';
import { Input, Button, Spinner, EmptyState, Card } from '../ui';
import { debounce, truncate } from '../../utils/helpers';
import api from '../../api/client';

/**
 * Browse tab - exploratory retrieval with rich metadata exposure
 * Distinct from Ask (RAG) tab: shows raw chunks with quality scores vs synthesized Q&A
 */
function BrowseTab({ onTabChange }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ limit: 10 });
  const [showFilters, setShowFilters] = useState(false);
  const [similarMode, setSimilarMode] = useState(null); // { chunkId, preview }

  const { results, loading, error, search, clear } = useSearch();
  const { documents, fetchDocuments } = useDocuments();

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((q, f) => search(q, f), 300),
    [search]
  );

  const handleQueryChange = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      setSimilarMode(null); // Clear similar mode when typing new query
      if (value.trim().length >= 2) {
        debouncedSearch(value, filters);
      } else if (!value.trim()) {
        clear();
      }
    },
    [debouncedSearch, filters, clear]
  );

  const handleSearch = useCallback(
    (e) => {
      e?.preventDefault();
      setSimilarMode(null);
      if (query.trim()) {
        search(query, filters);
      }
    },
    [query, filters, search]
  );

  const handleFilterChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      if (query.trim() && !similarMode) {
        search(query, newFilters);
      }
    },
    [query, search, similarMode]
  );

  const handleResultSelect = useCallback((result) => {
    // Could open a detail modal or navigate to document
    console.log('Selected result:', result);
  }, []);

  /**
   * Handle "Ask About" action - navigate to Ask tab with context
   */
  const handleAskAbout = useCallback((result) => {
    // Store selected chunk in sessionStorage for Ask tab to pick up
    sessionStorage.setItem('askContext', JSON.stringify({
      chunkId: result.chunk_id,
      content: truncate(result.content, 500),
      documentId: result.document_id,
      documentTitle: result.document_title,
      pageNumber: result.page_start ?? result.page_number
    }));

    // Navigate to Ask tab
    onTabChange?.('ask');
  }, [onTabChange]);

  /**
   * Handle "Find Similar" action - search for similar chunks
   */
  const handleFindSimilar = useCallback(async (result) => {
    if (!result.chunk_id) {
      console.warn('No chunk_id available for similar search');
      return;
    }

    try {
      // Extract key phrase from content for similarity search
      // Take first 100 chars, find sentence boundary
      const content = result.content || '';
      let searchPhrase = content.slice(0, 150);
      const sentenceEnd = searchPhrase.search(/[.!?]\s/);
      if (sentenceEnd > 30) {
        searchPhrase = searchPhrase.slice(0, sentenceEnd + 1);
      }
      searchPhrase = searchPhrase.trim();

      setSimilarMode({
        chunkId: result.chunk_id,
        preview: truncate(result.content, 50)
      });

      // Use content-based search as fallback (FAISS direct map not available)
      const similarQuery = searchPhrase || result.document_title || 'related content';
      setQuery(similarQuery);

      // Trigger search with the extracted phrase
      await search(similarQuery, { ...filters, exclude_chunk_id: result.chunk_id });
    } catch (err) {
      console.error('Similar search failed:', err);
    }
  }, [filters, search]);

  // Virtual list for performance
  const {
    virtualItems,
    containerProps,
    wrapperProps,
  } = useVirtualList(results, {
    itemHeight: 180, // Larger cards need more height
    containerHeight: 600,
    overscan: 3,
  });

  return (
    <div className="browse-tab" role="region" aria-label="Browse knowledge base">
      <header className="tab-header">
        <h2 className="tab-title">
          <Compass size={24} aria-hidden="true" />
          Browse Knowledge Base
        </h2>
        <p className="tab-description">
          Explore chunks, view metadata, and discover related content
        </p>
      </header>

      <form onSubmit={handleSearch} className="browse-form" role="search">
        <div className="browse-input-wrapper">
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter your search query..."
            leftIcon={<Compass size={18} />}
            aria-label="Browse query"
          />
          <Button type="submit" disabled={!query.trim() || loading}>
            {loading ? 'Searching...' : 'Browse'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="browse-filters"
          >
            Filters
          </Button>
        </div>

        {similarMode && (
          <div className="similar-mode-banner">
            <span>Showing similar chunks to: "{similarMode.preview}"</span>
            <button
              type="button"
              className="similar-mode-clear"
              onClick={() => {
                setSimilarMode(null);
                setQuery('');
                clear();
              }}
            >
              Clear
            </button>
          </div>
        )}
      </form>

      {showFilters && (
        <Card id="browse-filters" className="browse-filters-card">
          <BrowseFilters
            filters={filters}
            onChange={handleFilterChange}
            documents={documents}
          />
        </Card>
      )}

      <div className="browse-results" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="browse-loading">
            <Spinner label="Searching documents..." />
          </div>
        )}

        {error && (
          <EmptyState
            icon={<Compass size={48} />}
            title="Browse Error"
            description={error.message || 'Failed to search'}
          />
        )}

        {!loading && !error && results.length === 0 && query && (
          <EmptyState
            icon={<Compass size={48} />}
            title="No Results Found"
            description={`No chunks match "${query}". Try different terms or adjust filters.`}
          />
        )}

        {!loading && !error && results.length === 0 && !query && (
          <EmptyState
            icon={<Compass size={48} />}
            title="Start Browsing"
            description="Enter a query to explore your knowledge base. Use filters to narrow by chunk type, specialty, or quality."
          />
        )}

        {results.length > 0 && (
          <>
            <p className="browse-count" aria-live="polite">
              Found {results.length} chunk{results.length !== 1 ? 's' : ''}
            </p>

            <div {...containerProps} className="browse-results-list">
              <div {...wrapperProps}>
                {virtualItems.map(({ index, item, style }) => (
                  <div key={item.chunk_id || index} style={style}>
                    <BrowseResult
                      result={item}
                      query={similarMode ? '' : query}
                      onSelect={handleResultSelect}
                      onFindSimilar={handleFindSimilar}
                      onAsk={handleAskAbout}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(BrowseTab);
