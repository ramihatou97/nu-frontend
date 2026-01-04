import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { Tags, Search } from 'lucide-react';
import EntityCard from './EntityCard';
import { useEntities } from '../../hooks/useApi';
import { useVirtualList } from '../../hooks/useVirtualList';
import { Input, Button, Spinner, EmptyState, Card, Badge, Alert } from '../ui';
import { RefreshCw } from 'lucide-react';

const ENTITY_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'procedure', label: 'Procedures' },
  { id: 'condition', label: 'Conditions' },
  { id: 'medication', label: 'Medications' },
  { id: 'device', label: 'Devices' },
];

/**
 * Medical entities browser tab
 */
function EntitiesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState(null);

  const { entities, loading, error, fetchEntities, searchEntities } = useEntities();

  useEffect(() => {
    fetchEntities({ limit: 200 });
  }, [fetchEntities]);

  // Filter entities by type
  const filteredEntities = useMemo(() => {
    if (selectedType === 'all') return entities;
    return entities.filter((e) => e.type === selectedType);
  }, [entities, selectedType]);

  const handleSearch = useCallback(
    async (e) => {
      e?.preventDefault();
      if (searchQuery.trim()) {
        await searchEntities(
          searchQuery,
          selectedType !== 'all' ? selectedType : undefined
        );
      } else {
        await fetchEntities({ limit: 200 });
      }
    },
    [searchQuery, selectedType, searchEntities, fetchEntities]
  );

  const handleTypeChange = useCallback(
    (type) => {
      setSelectedType(type);
      if (searchQuery.trim()) {
        searchEntities(searchQuery, type !== 'all' ? type : undefined);
      }
    },
    [searchQuery, searchEntities]
  );

  const handleEntitySelect = useCallback((entity) => {
    setSelectedEntity(entity);
  }, []);

  // Virtual list for performance
  const { virtualItems, containerProps, wrapperProps } = useVirtualList(
    filteredEntities,
    {
      itemHeight: 100,
      containerHeight: 500,
      overscan: 5,
    }
  );

  // Group entities by type for statistics
  const typeCounts = useMemo(() => {
    const counts = { all: entities.length };
    entities.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [entities]);

  return (
    <div className="entities-tab" role="region" aria-label="Medical entities">
      <header className="tab-header">
        <h2 className="tab-title">
          <Tags size={24} aria-hidden="true" />
          Medical Entities
        </h2>
        <p className="tab-description">
          Browse and search extracted medical concepts
        </p>
      </header>

      {error && (
        <Alert variant="error" title="Failed to load entities">
          {error.message || 'An error occurred while loading entities.'}
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => fetchEntities({ limit: 200 })}
            style={{ marginLeft: '8px' }}
          >
            Retry
          </Button>
        </Alert>
      )}

      <form onSubmit={handleSearch} className="entities-search" role="search">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entities..."
          leftIcon={<Search size={18} />}
          aria-label="Search entities"
        />
        <Button type="submit" disabled={loading}>
          Search
        </Button>
      </form>

      <div
        className="entities-type-filter"
        role="tablist"
        aria-label="Filter by entity type"
      >
        {ENTITY_TYPES.map((type) => (
          <button
            key={type.id}
            role="tab"
            aria-selected={selectedType === type.id}
            className={`type-filter-button ${selectedType === type.id ? 'active' : ''}`}
            onClick={() => handleTypeChange(type.id)}
          >
            {type.label}
            <Badge size="sm" variant={selectedType === type.id ? 'info' : 'default'}>
              {typeCounts[type.id] || 0}
            </Badge>
          </button>
        ))}
      </div>

      <div className="entities-content">
        <div className="entities-list-container">
          {loading && entities.length === 0 ? (
            <Spinner label="Loading entities..." />
          ) : filteredEntities.length === 0 ? (
            <EmptyState
              icon={<Tags size={48} />}
              title="No Entities Found"
              description={
                searchQuery
                  ? `No entities match "${searchQuery}"`
                  : 'Ingest documents to extract medical entities'
              }
            />
          ) : (
            <div
              {...containerProps}
              className="entities-list"
              role="list"
              aria-label="Entities"
            >
              <div {...wrapperProps}>
                {virtualItems.map(({ index, item, style }) => (
                  <div key={item.cui || index} style={style}>
                    <EntityCard
                      entity={item}
                      onSelect={handleEntitySelect}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedEntity && (
          <Card className="entity-detail-card">
            <header className="entity-detail-header">
              <h3>{selectedEntity.name}</h3>
              <Badge variant="info">{selectedEntity.type}</Badge>
            </header>

            <dl className="entity-detail-info">
              <dt>CUI</dt>
              <dd>{selectedEntity.cui}</dd>

              <dt>Frequency</dt>
              <dd>{selectedEntity.frequency} occurrences</dd>

              {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
                <>
                  <dt>Aliases</dt>
                  <dd>{selectedEntity.aliases.join(', ')}</dd>
                </>
              )}

              {selectedEntity.definition && (
                <>
                  <dt>Definition</dt>
                  <dd>{selectedEntity.definition}</dd>
                </>
              )}
            </dl>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEntity(null)}
            >
              Close
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

export default memo(EntitiesTab);
