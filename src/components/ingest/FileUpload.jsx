/**
 * Multi-File Upload Component
 *
 * Supports selecting and managing multiple PDF files for batch upload.
 */

import React, { useState, useRef, useCallback, memo } from 'react';
import { Upload, FileText, X, Trash2 } from 'lucide-react';
import { formatFileSize } from '../../utils/helpers';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  maxFiles: 10,
  maxFileSizeMB: 100,
  maxTotalSizeMB: 500,
  acceptedTypes: ['.pdf', 'application/pdf'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function validateFile(file, config) {
  const errors = [];

  // Check type
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!config.acceptedTypes.includes(ext) &&
      !config.acceptedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Only PDF files are allowed.`);
  }

  // Check size
  if (file.size > config.maxFileSizeMB * 1024 * 1024) {
    errors.push(`File exceeds ${config.maxFileSizeMB}MB limit.`);
  }

  return errors;
}

// =============================================================================
// COMPONENT
// =============================================================================

function FileUpload({
  selectedFiles = [],
  onFilesChange,
  disabled = false,
  maxFiles = DEFAULT_CONFIG.maxFiles,
  maxFileSizeMB = DEFAULT_CONFIG.maxFileSizeMB,
  maxTotalSizeMB = DEFAULT_CONFIG.maxTotalSizeMB,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const config = {
    ...DEFAULT_CONFIG,
    maxFiles,
    maxFileSizeMB,
    maxTotalSizeMB,
  };

  // Calculate totals
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const remainingSlots = maxFiles - selectedFiles.length;

  // ==========================================================================
  // FILE HANDLING
  // ==========================================================================

  const processFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = [];
    const fileErrors = [];

    // Check total count
    if (selectedFiles.length + fileArray.length > config.maxFiles) {
      fileErrors.push(`Maximum ${config.maxFiles} files allowed. You have ${selectedFiles.length}, trying to add ${fileArray.length}.`);
    }

    // Validate each file
    fileArray.forEach(file => {
      const errs = validateFile(file, config);
      if (errs.length > 0) {
        fileErrors.push(`${file.name}: ${errs.join(', ')}`);
      } else {
        // Check for duplicates
        const isDuplicate = selectedFiles.some(
          f => f.name === file.name && f.size === file.size
        );
        if (isDuplicate) {
          fileErrors.push(`${file.name}: Already selected`);
        } else {
          validFiles.push(file);
        }
      }
    });

    // Check total size
    const newTotalSize = totalSize + validFiles.reduce((s, f) => s + f.size, 0);
    if (newTotalSize > config.maxTotalSizeMB * 1024 * 1024) {
      fileErrors.push(`Total size would exceed ${config.maxTotalSizeMB}MB limit.`);
      setErrors(fileErrors);
      return;
    }

    // Limit to remaining slots
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (fileErrors.length > 0) {
      setErrors(fileErrors);
    } else {
      setErrors([]);
    }

    if (filesToAdd.length > 0) {
      onFilesChange([...selectedFiles, ...filesToAdd]);
    }
  }, [selectedFiles, config, totalSize, remainingSlots, onFilesChange]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files?.length > 0) {
      processFiles(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [processFiles]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleRemoveFile = useCallback((index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
    setErrors([]);
  }, [selectedFiles, onFilesChange]);

  const handleClearAll = useCallback(() => {
    onFilesChange([]);
    setErrors([]);
  }, [onFilesChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrowseClick();
    }
  }, [handleBrowseClick]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="file-upload-container">
      {/* Drop Zone */}
      <div
        className={`file-upload ${isDragging ? 'file-upload-active' : ''} ${disabled ? 'file-upload-disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload PDF files. Click or drag and drop."
        aria-disabled={disabled}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="file-upload-input"
          aria-hidden="true"
        />

        <div className="file-upload-placeholder">
          <Upload size={40} aria-hidden="true" />
          <p className="file-upload-text">
            {isDragging ? (
              <strong>Drop files here</strong>
            ) : (
              <>
                <strong>Click to upload</strong> or drag and drop
              </>
            )}
          </p>
          <p className="file-upload-hint">
            Max {maxFiles} files, {maxFileSizeMB}MB per file, {maxTotalSizeMB}MB total
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="file-upload-errors" role="alert">
          {errors.map((err, i) => (
            <p key={i} className="file-upload-error">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <span className="file-count">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              ({formatFileSize(totalSize)})
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={disabled}
              className="file-list-clear"
              aria-label="Clear all files"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          </div>

          <ul className="file-list-items">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${index}`} className="file-list-item">
                <FileText size={20} className="file-icon" aria-hidden="true" />
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  disabled={disabled}
                  className="file-remove"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default memo(FileUpload);
