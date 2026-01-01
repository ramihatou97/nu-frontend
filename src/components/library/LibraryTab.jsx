import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { Library, Grid, List, Trash2, RefreshCw } from 'lucide-react';
import DocumentCard from './DocumentCard';
import DocumentViewer from './DocumentViewer';
import { useDocuments } from '../../hooks/useApi';
import { useVirtualList } from '../../hooks/useVirtualList';
import { Input, Button, Spinner, EmptyState, Card } from '../ui';

/**
 * Document library tab component
 */
function LibraryTab() {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('created_at');
  const [viewingDocId, setViewingDocId] = useState(null);

  const { documents, loading, error, fetchDocuments, deleteDocument, bulkDelete } = useDocuments();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(query) ||
          doc.filename?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || a.filename).localeCompare(b.title || b.filename);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return result;
  }, [documents, searchQuery, sortBy]);

  const handleSelect = useCallback((doc) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(doc.id)) {
        next.delete(doc.id);
      } else {
        next.add(doc.id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    }
  }, [selectedIds.size, filteredDocuments]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} document(s)?`)) return;

    await bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, bulkDelete]);

  const handleDelete = useCallback(
    async (docId) => {
      await deleteDocument(docId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    },
    [deleteDocument]
  );

  const handleView = useCallback((docId) => {
    setViewingDocId(docId);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewingDocId(null);
  }, []);

  // Virtual list for list view
  const {
    virtualItems,
    containerProps,
    wrapperProps,
  } = useVirtualList(filteredDocuments, {
    itemHeight: 80,
    containerHeight: 500,
    overscan: 5,
  });

  if (loading && documents.length === 0) {
    return (
      <div className="library-tab loading">
        <Spinner size="lg" label="Loading documents..." />
      </div>
    );
  }

  return (
    <div className="library-tab" role="region" aria-label="Document library">
      <header className="tab-header">
        <h2 className="tab-title">
          <Library size={24} aria-hidden="true" />
          Document Library
        </h2>
        <p className="tab-description">
          Manage your ingested documents ({documents.length} total)
        </p>
      </header>

      <div className="library-toolbar">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="library-search"
          aria-label="Search documents"
        />

        <div className="library-actions">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="library-sort"
            aria-label="Sort documents by"
          >
            <option value="created_at">Date Added</option>
            <option value="title">Title</option>
          </select>

          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
            >
              <Grid size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              <List size={18} aria-hidden="true" />
            </button>
          </div>

          <Button
            variant="ghost"
            icon={<RefreshCw size={16} />}
            onClick={() => fetchDocuments()}
            aria-label="Refresh documents"
          />

          {selectedIds.size > 0 && (
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={handleBulkDelete}
            >
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<Library size={48} />}
          title={searchQuery ? 'No Matches' : 'No Documents'}
          description={
            searchQuery
              ? `No documents match "${searchQuery}"`
              : 'Upload documents in the Ingest tab to get started'
          }
        />
      ) : viewMode === 'grid' ? (
        <div
          className="library-grid"
          role="listbox"
          aria-label="Documents"
          aria-multiselectable="true"
        >
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              selected={selectedIds.has(doc.id)}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      ) : (
        <div
          {...containerProps}
          className="library-list"
          role="listbox"
          aria-label="Documents"
        >
          <div {...wrapperProps}>
            {virtualItems.map(({ index, item, style }) => (
              <div key={item.id} style={style}>
                <DocumentCard
                  document={item}
                  selected={selectedIds.has(item.id)}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocId && (
        <DocumentViewer
          documentId={viewingDocId}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}

export default memo(LibraryTab);
