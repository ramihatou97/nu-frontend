/**
 * useBatchIngestion Hook
 *
 * Manages batch upload state, polling, and progress tracking.
 */

import { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { api } from '../api/client';

// =============================================================================
// BATCH STATUS CONSTANTS
// =============================================================================

export const BATCH_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
};

// =============================================================================
// useBatchIngestion HOOK
// =============================================================================

/**
 * Hook for managing batch PDF uploads with progress tracking.
 *
 * @param {Object} options
 * @param {number} options.pollInterval - Polling interval in ms (default: 2000)
 * @param {Function} options.onComplete - Callback when batch completes
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onFileComplete - Callback when individual file completes
 *
 * @returns {Object} Batch ingestion state and methods
 */
export function useBatchIngestion(options = {}) {
  const {
    pollInterval = 2000,
    onComplete,
    onError,
    onFileComplete,
  } = options;

  // State
  const [batchId, setBatchId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [batchStatus, setBatchStatus] = useState(BATCH_STATUS.IDLE);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Refs for cleanup and tracking
  const pollingRef = useRef(null);
  const isMountedRef = useRef(true);
  const previousCompletedRef = useRef(new Set());
  const currentPollingIntervalRef = useRef(pollInterval);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Computed values
  const totalCount = jobs.length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;

  const overallProgress = totalCount > 0
    ? Math.round(((completedCount + failedCount) / totalCount) * 100)
    : 0;

  const isActive = [
    BATCH_STATUS.UPLOADING,
    BATCH_STATUS.PENDING,
    BATCH_STATUS.PROCESSING,
  ].includes(batchStatus);

  const canRetry = batchStatus === BATCH_STATUS.PARTIAL ||
                   batchStatus === BATCH_STATUS.FAILED;

  // ==========================================================================
  // POLL STATUS
  // ==========================================================================

  // Adaptive polling interval based on current stage
  const getPollingInterval = useCallback((stage) => {
    // Slower polling during VLM (long-running stage)
    if (stage === 'vlm' || stage === 'vlm_caption' || stage === 'VLM captioning') {
      return 5000;
    }
    // Default interval for quick stages
    return pollInterval;
  }, [pollInterval]);

  const pollStatus = useCallback(async (id) => {
    if (!id || !isMountedRef.current) return;

    try {
      const status = await api.getBatchStatus(id);

      if (!isMountedRef.current) return;

      // Batch all state updates using startTransition for smoother UI
      startTransition(() => {
        setJobs(status.jobs);
        setCurrentFileIndex(status.current_file_index);
        setCurrentFileName(status.current_file_name);
        setElapsedSeconds(status.elapsed_seconds || 0);
        const newStatus = status.status.toUpperCase();
        setBatchStatus(BATCH_STATUS[newStatus] || status.status);
      });

      // Check for newly completed files (outside transition for immediate feedback)
      if (onFileComplete) {
        status.jobs.forEach(job => {
          if (job.status === 'completed' &&
              !previousCompletedRef.current.has(job.job_id)) {
            previousCompletedRef.current.add(job.job_id);
            onFileComplete(job);
          }
        });
      }

      // Adjust polling interval based on current stage
      const currentStage = status.jobs.find(j => j.status === 'processing')?.current_stage;
      const newInterval = getPollingInterval(currentStage);
      if (pollingRef.current && currentPollingIntervalRef.current !== newInterval) {
        currentPollingIntervalRef.current = newInterval;
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => pollStatus(id), newInterval);
      }

      // Check if finished
      if (['completed', 'failed', 'partial', 'cancelled'].includes(status.status)) {
        stopPolling();

        if (status.status === 'completed') {
          onComplete?.(status);
        } else if (status.status === 'failed') {
          onError?.(new Error('Batch processing failed'));
        }
      }

    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop polling on transient errors
    }
  }, [onComplete, onError, onFileComplete, getPollingInterval]);

  // ==========================================================================
  // POLLING CONTROL
  // ==========================================================================

  const startPolling = useCallback((id) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Reset polling interval
    currentPollingIntervalRef.current = pollInterval;

    // Immediate first poll
    pollStatus(id);

    // Set up interval
    pollingRef.current = setInterval(() => {
      pollStatus(id);
    }, pollInterval);
  }, [pollInterval, pollStatus]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ==========================================================================
  // UPLOAD BATCH
  // ==========================================================================

  const uploadBatch = useCallback(async (files, config = {}) => {
    if (!files || files.length === 0) {
      setError('No files provided');
      return null;
    }

    setIsUploading(true);
    setError(null);
    setBatchStatus(BATCH_STATUS.UPLOADING);
    setJobs([]);
    setBatchId(null);
    previousCompletedRef.current = new Set();

    try {
      const response = await api.uploadBatch(files, config);

      if (!isMountedRef.current) return null;

      setBatchId(response.batch_id);
      setJobs(response.jobs);
      setBatchStatus(BATCH_STATUS.PENDING);
      setStartedAt(new Date());
      setIsUploading(false);

      // Start polling
      startPolling(response.batch_id);

      return response;

    } catch (err) {
      if (!isMountedRef.current) return null;

      const errorMsg = err.message || 'Upload failed';
      setError(errorMsg);
      setBatchStatus(BATCH_STATUS.FAILED);
      setIsUploading(false);
      onError?.(err);

      return null;
    }
  }, [onError, startPolling]);

  // ==========================================================================
  // CANCEL BATCH
  // ==========================================================================

  const cancelBatch = useCallback(async () => {
    if (!batchId) return;

    try {
      await api.cancelBatch(batchId);

      if (!isMountedRef.current) return;

      setBatchStatus(BATCH_STATUS.CANCELLED);
      stopPolling();

    } catch (err) {
      setError(err.message || 'Cancel failed');
    }
  }, [batchId, stopPolling]);

  // ==========================================================================
  // RETRY FAILED
  // ==========================================================================

  const retryFailed = useCallback(async () => {
    if (!batchId || !canRetry) return;

    setError(null);

    try {
      const response = await api.retryFailedJobs(batchId);

      if (!isMountedRef.current) return;

      if (response.retry_count > 0) {
        setBatchStatus(BATCH_STATUS.PROCESSING);
        startPolling(batchId);
      }

      return response;

    } catch (err) {
      setError(err.message || 'Retry failed');
      return null;
    }
  }, [batchId, canRetry, startPolling]);

  // ==========================================================================
  // RESET
  // ==========================================================================

  const reset = useCallback(() => {
    stopPolling();
    setBatchId(null);
    setJobs([]);
    setBatchStatus(BATCH_STATUS.IDLE);
    setError(null);
    setIsUploading(false);
    setCurrentFileIndex(0);
    setCurrentFileName(null);
    setStartedAt(null);
    setElapsedSeconds(0);
    previousCompletedRef.current = new Set();
  }, [stopPolling]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    batchId,
    jobs,
    batchStatus,
    error,
    isUploading,
    currentFileIndex,
    currentFileName,
    startedAt,
    elapsedSeconds,

    // Computed
    totalCount,
    completedCount,
    failedCount,
    pendingCount,
    processingCount,
    overallProgress,
    isActive,
    canRetry,

    // Actions
    uploadBatch,
    cancelBatch,
    retryFailed,
    reset,
  };
}

export default useBatchIngestion;
