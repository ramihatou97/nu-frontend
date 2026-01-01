import React, { memo, useCallback, useState, useEffect } from 'react';
import { Columns, Plus, X } from 'lucide-react';
import { useDocuments } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Button, Card, Spinner, EmptyState } from '../ui';
import { useToast } from '../../context/ToastContext';

/**
 * Side-by-side document comparison tab
 */
function CompareTab() {
  const [leftDoc, setLeftDoc] = useState(null);
  const [rightDoc, setRightDoc] = useState(null);
  const [leftChunks, setLeftChunks] = useState([]);
  const [rightChunks, setRightChunks] = useState([]);
  const [loading, setLoading] = useState({ left: false, right: false });
  const toast = useToast();

  const { documents, fetchDocuments } = useDocuments();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const loadChunks = useCallback(async (docId, side) => {
    setLoading((prev) => ({ ...prev, [side]: true }));
    try {
      const chunks = await api.documentsChunks(docId);
      if (side === 'left') {
        setLeftChunks(Array.isArray(chunks) ? chunks : chunks.chunks || []);
      } else {
        setRightChunks(Array.isArray(chunks) ? chunks : chunks.chunks || []);
      }
    } catch (err) {
      toast.error('Failed to load document chunks');
    } finally {
      setLoading((prev) => ({ ...prev, [side]: false }));
    }
  }, [toast]);

  const handleDocSelect = useCallback(
    (doc, side) => {
      if (side === 'left') {
        setLeftDoc(doc);
        loadChunks(doc.id, 'left');
      } else {
        setRightDoc(doc);
        loadChunks(doc.id, 'right');
      }
    },
    [loadChunks]
  );

  const handleClear = useCallback((side) => {
    if (side === 'left') {
      setLeftDoc(null);
      setLeftChunks([]);
    } else {
      setRightDoc(null);
      setRightChunks([]);
    }
  }, []);

  const availableDocs = documents.filter(
    (d) => d.id !== leftDoc?.id && d.id !== rightDoc?.id
  );

  const renderDocumentSelector = (side) => {
    const selectedDoc = side === 'left' ? leftDoc : rightDoc;
    const isLoading = loading[side];

    if (selectedDoc) {
      return (
        <div className="compare-doc-header">
          <h4>{selectedDoc.title || selectedDoc.filename}</h4>
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={14} />}
            onClick={() => handleClear(side)}
            aria-label={`Remove ${side} document`}
          />
        </div>
      );
    }

    return (
      <div className="compare-doc-selector">
        <label htmlFor={`select-${side}`} className="sr-only">
          Select {side} document
        </label>
        <select
          id={`select-${side}`}
          className="compare-select"
          onChange={(e) => {
            const doc = documents.find((d) => d.id === e.target.value);
            if (doc) handleDocSelect(doc, side);
          }}
          value=""
        >
          <option value="" disabled>
            Select a document...
          </option>
          {availableDocs.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title || doc.filename}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderChunks = (chunks, isLoading, side) => {
    if (isLoading) {
      return <Spinner label="Loading content..." />;
    }

    if (chunks.length === 0) {
      return (
        <EmptyState
          icon={<Plus size={32} />}
          title="No Document Selected"
          description="Select a document above to view its content"
        />
      );
    }

    return (
      <div className="compare-chunks" role="list" aria-label={`${side} document content`}>
        {chunks.map((chunk, i) => (
          <article
            key={chunk.id || i}
            className="compare-chunk"
            role="listitem"
          >
            {chunk.page && (
              <span className="chunk-page">Page {chunk.page}</span>
            )}
            <p className="chunk-content">{chunk.content}</p>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="compare-tab" role="region" aria-label="Document comparison">
      <header className="tab-header">
        <h2 className="tab-title">
          <Columns size={24} aria-hidden="true" />
          Compare Documents
        </h2>
        <p className="tab-description">
          View two documents side by side for comparison
        </p>
      </header>

      {documents.length < 2 ? (
        <EmptyState
          icon={<Columns size={48} />}
          title="Not Enough Documents"
          description="You need at least two documents to compare. Ingest more documents first."
        />
      ) : (
        <div className="compare-container">
          <Card className="compare-panel compare-left" aria-label="Left document">
            {renderDocumentSelector('left')}
            {renderChunks(leftChunks, loading.left, 'left')}
          </Card>

          <div className="compare-divider" aria-hidden="true" />

          <Card className="compare-panel compare-right" aria-label="Right document">
            {renderDocumentSelector('right')}
            {renderChunks(rightChunks, loading.right, 'right')}
          </Card>
        </div>
      )}
    </div>
  );
}

export default memo(CompareTab);
