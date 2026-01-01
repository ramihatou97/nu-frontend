import React, { memo, useCallback, useState } from 'react';
import { Upload, Settings, Play, RefreshCw } from 'lucide-react';
import FileUpload from './FileUpload';
import BatchProgress from './BatchProgress';
import { useBatchIngestion, BATCH_STATUS } from '../../hooks/useBatchIngestion';
import { Button, Card, Alert } from '../ui';
import { useToast } from '../../context/ToastContext';

/**
 * Document ingestion tab component with batch upload support
 */
function IngestTab() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [config, setConfig] = useState({
    titlePrefix: '',
    extractImages: true,
    extractTables: true,
    detectSections: true,
    generateEmbeddings: true,
    vlmCaptioning: true,
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const [showConfig, setShowConfig] = useState(false);

  const toast = useToast();

  // Batch ingestion hook
  const {
    batchId,
    jobs,
    batchStatus,
    error,
    isUploading,
    currentFileIndex,
    completedCount,
    failedCount,
    elapsedSeconds,
    isActive,
    canRetry,
    uploadBatch,
    cancelBatch,
    retryFailed,
    reset,
  } = useBatchIngestion({
    pollInterval: 2000,
    onComplete: (status) => {
      toast.success(`Batch complete! ${status.completed_files} files processed.`);
    },
    onError: (err) => {
      toast.error(`Batch failed: ${err.message}`);
    },
    onFileComplete: (job) => {
      toast.success(`Completed: ${job.filename}`);
    },
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleFilesChange = useCallback((files) => {
    setSelectedFiles(files);
  }, []);

  const handleStartIngestion = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    const result = await uploadBatch(selectedFiles, config);

    if (result) {
      // Clear file selection after successful upload
      setSelectedFiles([]);
    }
  }, [selectedFiles, config, uploadBatch, toast]);

  const handleCancel = useCallback(async () => {
    await cancelBatch();
    toast.info('Batch cancelled');
  }, [cancelBatch, toast]);

  const handleRetry = useCallback(async () => {
    const result = await retryFailed();
    if (result) {
      toast.info(`Retrying ${result.retry_count} failed files`);
    }
  }, [retryFailed, toast]);

  const handleReset = useCallback(() => {
    reset();
    setSelectedFiles([]);
  }, [reset]);

  const toggleConfig = useCallback((key) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleConfigChange = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ==========================================================================
  // RENDER STATES
  // ==========================================================================

  // Show progress when batch is active or has results
  const showProgress = batchId && batchStatus !== BATCH_STATUS.IDLE;

  // Determine completion states
  const isComplete = batchStatus === BATCH_STATUS.COMPLETED;
  const isPartial = batchStatus === BATCH_STATUS.PARTIAL;
  const isFailed = batchStatus === BATCH_STATUS.FAILED;
  const isCancelled = batchStatus === BATCH_STATUS.CANCELLED;
  const hasError = error || isFailed;

  return (
    <div className="ingest-tab" role="region" aria-label="Document ingestion">
      <header className="tab-header">
        <h2 className="tab-title">
          <Upload size={24} aria-hidden="true" />
          Ingest Documents
        </h2>
        <p className="tab-description">
          Upload PDF documents to process through the ingestion pipeline.
          Supports batch upload of up to 10 files.
        </p>
      </header>

      {/* Error Display */}
      {hasError && error && !showProgress && (
        <Alert variant="error" title="Error">
          {error}
          <div className="alert-actions">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Batch Progress */}
      {showProgress && (
        <Card className="ingest-progress-card">
          <BatchProgress
            jobs={jobs}
            batchStatus={batchStatus}
            currentFileIndex={currentFileIndex}
            completedCount={completedCount}
            failedCount={failedCount}
            elapsedSeconds={elapsedSeconds}
            onCancel={isActive ? handleCancel : null}
            onRetry={canRetry ? handleRetry : null}
            canRetry={canRetry}
          />

          {/* Reset button after completion */}
          {!isActive && (
            <div className="ingest-actions" style={{ marginTop: '16px' }}>
              <Button
                variant="primary"
                icon={<RefreshCw size={18} />}
                onClick={handleReset}
              >
                Start New Batch
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* File Selection (when not actively processing) */}
      {!isActive && (
        <Card className="ingest-upload-card">
          <FileUpload
            selectedFiles={selectedFiles}
            onFilesChange={handleFilesChange}
            disabled={isUploading}
            maxFiles={10}
            maxFileSizeMB={100}
            maxTotalSizeMB={500}
          />

          <div className="ingest-config-toggle">
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings size={16} />}
              onClick={() => setShowConfig(!showConfig)}
              aria-expanded={showConfig}
              aria-controls="ingest-config"
            >
              {showConfig ? 'Hide Options' : 'Show Options'}
            </Button>
          </div>

          {showConfig && (
            <fieldset id="ingest-config" className="ingest-config">
              <legend className="sr-only">Ingestion options</legend>

              {/* Title Prefix */}
              <div className="config-option config-option-text">
                <label className="config-label" htmlFor="title-prefix">
                  Title Prefix (optional)
                </label>
                <input
                  id="title-prefix"
                  type="text"
                  value={config.titlePrefix}
                  onChange={(e) => handleConfigChange('titlePrefix', e.target.value)}
                  placeholder="e.g., Neurosurgery - "
                  className="config-input"
                  disabled={isUploading}
                />
                <span className="config-desc">
                  Prefix added to all document titles
                </span>
              </div>

              {/* Chunk Size */}
              <div className="config-option config-option-text">
                <label className="config-label" htmlFor="chunk-size">
                  Chunk Size (tokens)
                </label>
                <input
                  id="chunk-size"
                  type="number"
                  value={config.chunkSize}
                  onChange={(e) => handleConfigChange('chunkSize', parseInt(e.target.value) || 500)}
                  min={100}
                  max={2000}
                  className="config-input"
                  disabled={isUploading}
                />
              </div>

              <label className="config-option">
                <input
                  type="checkbox"
                  checked={config.extractImages}
                  onChange={() => toggleConfig('extractImages')}
                  aria-describedby="images-desc"
                />
                <span className="config-label">Extract Images</span>
                <span id="images-desc" className="config-desc">
                  Extract and process images from PDF
                </span>
              </label>

              <label className="config-option">
                <input
                  type="checkbox"
                  checked={config.extractTables}
                  onChange={() => toggleConfig('extractTables')}
                  aria-describedby="tables-desc"
                />
                <span className="config-label">Extract Tables</span>
                <span id="tables-desc" className="config-desc">
                  Detect and extract table structures
                </span>
              </label>

              <label className="config-option">
                <input
                  type="checkbox"
                  checked={config.detectSections}
                  onChange={() => toggleConfig('detectSections')}
                  aria-describedby="sections-desc"
                />
                <span className="config-label">Detect Sections</span>
                <span id="sections-desc" className="config-desc">
                  Identify document structure and headings
                </span>
              </label>

              <label className="config-option">
                <input
                  type="checkbox"
                  checked={config.generateEmbeddings}
                  onChange={() => toggleConfig('generateEmbeddings')}
                  aria-describedby="embeddings-desc"
                />
                <span className="config-label">Generate Embeddings</span>
                <span id="embeddings-desc" className="config-desc">
                  Create vector embeddings for semantic search
                </span>
              </label>

              <label className="config-option">
                <input
                  type="checkbox"
                  checked={config.vlmCaptioning}
                  onChange={() => toggleConfig('vlmCaptioning')}
                  disabled={!config.extractImages}
                  aria-describedby="vlm-desc"
                />
                <span className="config-label">VLM Image Captioning</span>
                <span id="vlm-desc" className="config-desc">
                  Generate AI descriptions for images
                </span>
              </label>
            </fieldset>
          )}

          <div className="ingest-actions">
            <Button
              variant="primary"
              icon={<Play size={18} />}
              onClick={handleStartIngestion}
              disabled={selectedFiles.length === 0 || isUploading}
              aria-label={
                selectedFiles.length > 0
                  ? `Start ingesting ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
                  : 'Select files first'
              }
            >
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  Start Ingestion
                  {selectedFiles.length > 0 && ` (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})`}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {isComplete && !isActive && (
        <Alert variant="success" title="Batch Complete">
          All {completedCount} documents processed successfully and added to the library.
        </Alert>
      )}

      {/* Partial Success Message */}
      {isPartial && !isActive && (
        <Alert variant="warning" title="Batch Partially Complete">
          {completedCount} documents processed successfully, {failedCount} failed.
          Use the "Retry Failed" button above to retry failed documents.
        </Alert>
      )}

      {/* Cancelled Message */}
      {isCancelled && !isActive && (
        <Alert variant="info" title="Batch Cancelled">
          Processing was cancelled. {completedCount} documents were completed before cancellation.
        </Alert>
      )}
    </div>
  );
}

export default memo(IngestTab);
