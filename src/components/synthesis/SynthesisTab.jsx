import React, { memo, useCallback, useState, useEffect } from 'react';
import { BookOpen, Play, Square, Download } from 'lucide-react';
import { useSynthesis, useDocuments } from '../../hooks/useApi';
import { parseMarkdown } from '../../utils/helpers';
import { Input, Button, Card, Spinner, EmptyState, Alert } from '../ui';

/**
 * Synthesis/textbook generation tab component
 */
function SynthesisTab() {
  const [topic, setTopic] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDocSelector, setShowDocSelector] = useState(false);

  const { content, loading, error, generate, clear } = useSynthesis();
  const { documents, fetchDocuments } = useDocuments();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;

    await generate(
      {
        topic,
        document_ids: selectedDocs.length > 0 ? selectedDocs : undefined,
      },
      { stream: true }
    );
  }, [topic, selectedDocs, generate]);

  const handleStop = useCallback(() => {
    // Cancel would go here
  }, []);

  const handleDocToggle = useCallback((docId) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  }, []);

  const handleClear = useCallback(() => {
    clear();
    setTopic('');
  }, [clear]);

  return (
    <div className="synthesis-tab" role="region" aria-label="Textbook synthesis">
      <header className="tab-header">
        <h2 className="tab-title">
          <BookOpen size={24} aria-hidden="true" />
          Synthesis
        </h2>
        <p className="tab-description">
          Generate comprehensive textbook chapters from your documents
        </p>
      </header>

      <Card className="synthesis-input-card">
        <div className="synthesis-form">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic to synthesize (e.g., 'Surgical approaches to acoustic neuroma')"
            label="Topic"
            disabled={loading}
          />

          <div className="synthesis-source-selector">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDocSelector(!showDocSelector)}
              aria-expanded={showDocSelector}
              aria-controls="doc-selector"
            >
              {selectedDocs.length > 0
                ? `${selectedDocs.length} document(s) selected`
                : 'All documents (click to filter)'}
            </Button>

            {showDocSelector && (
              <fieldset id="doc-selector" className="doc-selector">
                <legend className="sr-only">Select source documents</legend>
                {documents.map((doc) => (
                  <label key={doc.id} className="doc-selector-item">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => handleDocToggle(doc.id)}
                    />
                    <span>{doc.title || doc.filename}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </div>

          <div className="synthesis-actions">
            {loading ? (
              <Button variant="danger" icon={<Square size={16} />} onClick={handleStop}>
                Stop
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Play size={16} />}
                onClick={handleGenerate}
                disabled={!topic.trim()}
              >
                Generate Chapter
              </Button>
            )}

            {content && (
              <Button variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Generation Failed">
          {error.message || 'An error occurred during synthesis'}
        </Alert>
      )}

      <div className="synthesis-output" aria-live="polite" aria-busy={loading}>
        {loading && !content && (
          <div className="synthesis-loading">
            <Spinner label="Generating synthesis..." />
          </div>
        )}

        {content && (
          <Card className="synthesis-content-card">
            <header className="synthesis-content-header">
              <h3>Generated Chapter: {topic}</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={16} />}
                aria-label="Export options available in Export tab"
              >
                Export
              </Button>
            </header>
            <article
              className="synthesis-content"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
            {loading && <span className="typing-cursor" aria-label="Generating..." />}
          </Card>
        )}

        {!loading && !content && !error && (
          <EmptyState
            icon={<BookOpen size={48} />}
            title="Generate a Synthesis"
            description="Enter a topic above to create a comprehensive textbook chapter from your documents"
          />
        )}
      </div>
    </div>
  );
}

export default memo(SynthesisTab);
