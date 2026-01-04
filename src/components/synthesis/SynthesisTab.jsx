import React, { memo, useCallback, useState, useEffect } from 'react';
import { BookOpen, Play, Square, Download } from 'lucide-react';
import { useSynthesis, useDocuments } from '../../hooks/useApi';
import { useSynthesisOutput } from '../../context/SynthesisContext';
import { parseMarkdown } from '../../utils/helpers';
import { Input, Button, Card, Spinner, EmptyState, Alert } from '../ui';
import ConflictBadge from './ConflictBadge';
import ConflictPanel from './ConflictPanel';

/**
 * Available template types for synthesis
 */
const TEMPLATE_OPTIONS = [
  { value: 'PROCEDURAL', label: 'Procedural (Surgical)', description: 'Operative technique synthesis' },
  { value: 'DISORDER', label: 'Disorder/Pathology', description: 'Disease-focused synthesis' },
  { value: 'ANATOMY', label: 'Anatomical Region', description: 'Neuroanatomy synthesis' },
  { value: 'ENCYCLOPEDIA', label: 'Encyclopedia Entry', description: 'Comprehensive integration' },
];

/**
 * Synthesis/textbook generation tab component
 */
function SynthesisTab() {
  const [topic, setTopic] = useState('');
  const [templateType, setTemplateType] = useState('PROCEDURAL');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  const { content, result, loading, error, progress, generate, clear, cancel } = useSynthesis();
  const { documents, fetchDocuments } = useDocuments();
  const { setOutput: setSynthesisOutput } = useSynthesisOutput();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Sync content to SynthesisContext for Export tab
  useEffect(() => {
    if (content && !loading) {
      setSynthesisOutput(content, topic);
    }
  }, [content, loading, topic, setSynthesisOutput]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;

    await generate(
      {
        topic,
        template_type: templateType,
        document_ids: selectedDocs.length > 0 ? selectedDocs : undefined,
      },
      { stream: true }
    );
  }, [topic, templateType, selectedDocs, generate]);

  const handleStop = useCallback(() => {
    cancel();
  }, [cancel]);

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
    setShowConflicts(false);
    setSynthesisOutput('', '');
  }, [clear, setSynthesisOutput]);

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

          <div className="synthesis-template-selector">
            <label htmlFor="template-select" className="synthesis-label">
              Template Type
            </label>
            <select
              id="template-select"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              disabled={loading}
              className="synthesis-select"
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="synthesis-template-description">
              {TEMPLATE_OPTIONS.find((o) => o.value === templateType)?.description}
            </span>
          </div>

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
            <div className="synthesis-progress-info">
              <p className="synthesis-time-notice">
                ⏱️ Chapter generation typically takes 1-2 minutes
              </p>
              {progress && (
                <>
                  <div className="synthesis-progress-bar-container">
                    <div
                      className="synthesis-progress-bar"
                      style={{ width: `${progress.progress || 0}%` }}
                    />
                  </div>
                  <p className="synthesis-progress-stage">
                    {progress.message || `Stage: ${progress.stage || 'Initializing...'}`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {content && (
          <>
            <Card className="synthesis-content-card">
              <header className="synthesis-content-header">
                <h3>Generated Chapter: {topic}</h3>
                <div className="synthesis-header-actions">
                  {/* Show conflict badge when synthesis is complete and has result */}
                  {!loading && result && (
                    <ConflictBadge
                      count={result.conflict_count || 0}
                      onClick={() => setShowConflicts(!showConflicts)}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download size={16} />}
                    aria-label="Export options available in Export tab"
                  >
                    Export
                  </Button>
                </div>
              </header>
              <article
                className="synthesis-content"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
              />
              {loading && (
                <div className="synthesis-streaming-status">
                  <span className="typing-cursor" aria-label="Generating..." />
                  {progress && (
                    <span className="synthesis-current-section">
                      {progress.section ? `Generating: ${progress.section}` : progress.message}
                    </span>
                  )}
                </div>
              )}
            </Card>

            {/* Conflict panel - shown when conflicts detected and user clicks badge */}
            {!loading && result?.conflict_report && (result.conflict_count > 0 || showConflicts) && (
              <ConflictPanel
                report={result.conflict_report}
                defaultExpanded={showConflicts}
              />
            )}
          </>
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
