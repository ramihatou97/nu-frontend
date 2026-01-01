import React, { memo, useCallback, useState, useMemo } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import SearchResult from './SearchResult';
import SearchFilters from './SearchFilters';
import { useSearch, useDocuments } from '../../hooks/useApi';
import { useVirtualList } from '../../hooks/useVirtualList';
import { Input, Button, Spinner, EmptyState, Card } from '../ui';
import { debounce } from '../../utils/helpers';

/**
 * Semantic search tab component
 */
function SearchTab() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ limit: 10 });
  const [showFilters, setShowFilters] = useState(false);

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
      if (query.trim()) {
        search(query, filters);
      }
    },
    [query, filters, search]
  );

  const handleFilterChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      if (query.trim()) {
        search(query, newFilters);
      }
    },
    [query, search]
  );

  const handleResultSelect = useCallback((result) => {
    // Could open a detail modal or navigate to document
  }, []);

  // Virtual list for performance
  const {
    virtualItems,
    containerProps,
    wrapperProps,
  } = useVirtualList(results, {
    itemHeight: 120,
    containerHeight: 500,
    overscan: 3,
  });

  return (
    <div className="search-tab" role="region" aria-label="Semantic search">
      <header className="tab-header">
        <h2 className="tab-title">
          <SearchIcon size={24} aria-hidden="true" />
          Semantic Search
        </h2>
        <p className="tab-description">
          Search across all documents using natural language queries
        </p>
      </header>

      <form onSubmit={handleSearch} className="search-form" role="search">
        <div className="search-input-wrapper">
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter your search query..."
            leftIcon={<SearchIcon size={18} />}
            aria-label="Search query"
          />
          <Button type="submit" disabled={!query.trim() || loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="search-filters"
          >
            Filters
          </Button>
        </div>
      </form>

      {showFilters && (
        <Card id="search-filters" className="search-filters-card">
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            documents={documents}
            entityTypes={['anatomy', 'procedure', 'condition', 'medication']}
          />
        </Card>
      )}

      <div className="search-results" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="search-loading">
            <Spinner label="Searching documents..." />
          </div>
        )}

        {error && (
          <EmptyState
            icon={<SearchIcon size={48} />}
            title="Search Error"
            description={error.message || 'Failed to perform search'}
          />
        )}

        {!loading && !error && results.length === 0 && query && (
          <EmptyState
            icon={<SearchIcon size={48} />}
            title="No Results Found"
            description={`No documents match "${query}". Try different search terms.`}
          />
        )}

        {!loading && !error && results.length === 0 && !query && (
          <EmptyState
            icon={<SearchIcon size={48} />}
            title="Start Searching"
            description="Enter a query above to search your document library"
          />
        )}

        {results.length > 0 && (
          <>
            <p className="search-count" aria-live="polite">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>

            <div {...containerProps} className="search-results-list">
              <div {...wrapperProps}>
                {virtualItems.map(({ index, item, style }) => (
                  <div key={item.chunk_id || index} style={style}>
                    <SearchResult
                      result={item}
                      query={query}
                      onSelect={handleResultSelect}
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

export default memo(SearchTab);
