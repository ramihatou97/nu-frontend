/**
 * Batch Progress Components
 *
 * Displays overall batch progress and per-file status.
 */

import React, { memo } from 'react';
import { CheckCircle, XCircle, Clock, Loader, AlertTriangle } from 'lucide-react';

// =============================================================================
// BatchFileProgress - Individual file progress display
// =============================================================================

/**
 * Displays progress for a single file in a batch.
 */
// Custom comparison for memoization - only re-render when relevant props change
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.job.job_id === nextProps.job.job_id &&
    prevProps.job.status === nextProps.job.status &&
    prevProps.job.progress === nextProps.job.progress &&
    prevProps.job.current_stage === nextProps.job.current_stage &&
    prevProps.job.error === nextProps.job.error &&
    prevProps.isActive === nextProps.isActive
  );
};

export const BatchFileProgress = memo(function BatchFileProgress({ job, isActive = false }) {
  const { filename, status, progress, current_stage, error } = job;

  // Status configurations
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'var(--color-text-muted)',
      bgColor: 'var(--color-bg-secondary)',
      label: 'Waiting',
    },
    processing: {
      icon: Loader,
      color: 'var(--color-primary)',
      bgColor: 'var(--color-primary-light)',
      label: 'Processing',
    },
    completed: {
      icon: CheckCircle,
      color: 'var(--color-success)',
      bgColor: 'var(--color-success-light)',
      label: 'Completed',
    },
    failed: {
      icon: XCircle,
      color: 'var(--color-error)',
      bgColor: 'var(--color-error-light)',
      label: 'Failed',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div
      className={`batch-file-progress ${isActive ? 'batch-file-progress-active' : ''}`}
      style={{
        '--status-color': config.color,
        '--status-bg': config.bgColor,
      }}
    >
      {/* Status Icon */}
      <div className="batch-file-icon">
        <StatusIcon
          size={18}
          className={status === 'processing' ? 'spin' : ''}
        />
      </div>

      {/* File Info */}
      <div className="batch-file-info">
        <div className="batch-file-name">{filename}</div>

        {/* Progress bar for processing state */}
        {status === 'processing' && (
          <div className="batch-file-progress-bar">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}

        {/* Current stage */}
        {status === 'processing' && current_stage && (
          <div className="batch-file-stage">{current_stage}</div>
        )}

        {/* Error message */}
        {status === 'failed' && error && (
          <div className="batch-file-error">{error}</div>
        )}

        {/* Status label for non-processing states */}
        {status !== 'processing' && (
          <div className="batch-file-status">{config.label}</div>
        )}
      </div>
    </div>
  );
}, arePropsEqual);

// =============================================================================
// BatchProgress - Overall batch progress display
// =============================================================================

/**
 * Displays overall batch progress with individual file status.
 */
export const BatchProgress = memo(function BatchProgress({
  jobs = [],
  batchStatus = 'pending',
  currentFileIndex = 0,
  completedCount = 0,
  failedCount = 0,
  elapsedSeconds = 0,
  onCancel,
  onRetry,
  canRetry = false,
}) {
  const totalCount = jobs.length;
  const progress = totalCount > 0
    ? Math.round(((completedCount + failedCount) / totalCount) * 100)
    : 0;

  // Format elapsed time
  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Status message
  const getStatusMessage = () => {
    switch (batchStatus) {
      case 'uploading':
        return 'Uploading files...';
      case 'pending':
        return 'Preparing to process...';
      case 'processing':
        return `Processing file ${currentFileIndex + 1} of ${totalCount}`;
      case 'completed':
        return 'All files processed successfully!';
      case 'partial':
        return `Completed with ${failedCount} failed file${failedCount !== 1 ? 's' : ''}`;
      case 'failed':
        return 'Processing failed';
      case 'cancelled':
        return 'Processing cancelled';
      default:
        return 'Processing...';
    }
  };

  // Status class
  const getStatusClass = () => {
    switch (batchStatus) {
      case 'completed': return 'status-success';
      case 'partial': return 'status-warning';
      case 'failed': return 'status-error';
      case 'cancelled': return 'status-muted';
      default: return 'status-primary';
    }
  };

  const isActive = ['uploading', 'pending', 'processing'].includes(batchStatus);

  return (
    <div className="batch-progress">
      {/* Header */}
      <div className="batch-progress-header">
        <div className="batch-progress-title-row">
          <h3 className="batch-progress-title">Batch Processing</h3>
          <span className={`batch-status-badge ${getStatusClass()}`}>
            {batchStatus}
          </span>
        </div>
        <div className="batch-progress-elapsed">
          <Clock size={14} />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="batch-overall-progress">
        <div className="batch-progress-info">
          <span className="batch-progress-message">{getStatusMessage()}</span>
          <span className="batch-progress-counts">
            {completedCount} of {totalCount} complete
            {failedCount > 0 && (
              <span className="batch-failed-count"> ({failedCount} failed)</span>
            )}
          </span>
        </div>
        <div className="batch-progress-track">
          <div
            className={`batch-progress-fill ${getStatusClass()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* File List */}
      <div className="batch-file-list">
        {jobs.map((job, index) => (
          <BatchFileProgress
            key={job.job_id}
            job={job}
            isActive={index === currentFileIndex && isActive}
          />
        ))}
      </div>

      {/* Actions */}
      {(isActive || canRetry) && (
        <div className="batch-actions">
          {isActive && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
          {canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-warning"
            >
              <AlertTriangle size={16} />
              Retry Failed ({failedCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default BatchProgress;
