import React, { memo } from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

/**
 * Pipeline stages for document ingestion (matches backend ingest.py)
 */
const PIPELINE_STAGES = [
  { id: 'upload', label: 'Upload' },
  { id: 'initializing', label: 'Initializing' },
  { id: 'extraction', label: 'PDF Extraction' },
  { id: 'chunking', label: 'Chunking' },
  { id: 'embedding', label: 'Embeddings' },
  { id: 'vlm', label: 'VLM Captioning' },
  { id: 'database', label: 'Database' },
  { id: 'export', label: 'Index Export' },
  { id: 'complete', label: 'Complete' },
];

/**
 * @typedef {Object} PipelineProgressProps
 * @property {string} currentStage - Current stage ID
 * @property {number} progress - Overall progress percentage
 * @property {string} [status='processing'] - Job status
 * @property {string} [message] - Status message
 */

/**
 * Visual pipeline progress indicator
 * @param {PipelineProgressProps} props
 */
function PipelineProgress({ currentStage, progress, status = 'processing', message }) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div
      className="pipeline-progress"
      role="region"
      aria-label="Ingestion pipeline progress"
    >
      <div className="pipeline-header">
        <h4 className="pipeline-title">Processing Pipeline</h4>
        <span className="pipeline-percentage" aria-live="polite">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="pipeline-bar">
        <div
          className="pipeline-bar-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <ol className="pipeline-stages" aria-label="Pipeline stages">
        {PIPELINE_STAGES.map((stage, index) => {
          let stageStatus = 'pending';
          if (index < currentIndex) stageStatus = 'completed';
          else if (index === currentIndex) stageStatus = 'active';

          return (
            <li
              key={stage.id}
              className={`pipeline-stage pipeline-stage-${stageStatus}`}
              aria-current={stageStatus === 'active' ? 'step' : undefined}
            >
              <span className="pipeline-stage-icon" aria-hidden="true">
                {stageStatus === 'completed' && <CheckCircle size={16} />}
                {stageStatus === 'active' && <Loader size={16} className="animate-spin" />}
                {stageStatus === 'pending' && <Circle size={16} />}
              </span>
              <span className="pipeline-stage-label">{stage.label}</span>
            </li>
          );
        })}
      </ol>

      {message && (
        <p className="pipeline-message" aria-live="polite">
          {message}
        </p>
      )}

      {status === 'error' && (
        <p className="pipeline-error" role="alert">
          An error occurred during processing
        </p>
      )}
    </div>
  );
}

export default memo(PipelineProgress);
