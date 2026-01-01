/**
 * @fileoverview Utility functions for the NeuroSynth frontend
 */

/**
 * Format file size to human readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date to locale string
 * @param {string|Date} date - Date to format
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format timestamp to relative time
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(d);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function execution
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate unique ID
 * @returns {string} UUID-like string
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Download filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download text as file
 * @param {string} text - Text content
 * @param {string} filename - Download filename
 * @param {string} [mimeType='text/plain'] - MIME type
 */
export function downloadText(text, filename, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Parse markdown-like text to basic HTML
 * @param {string} text - Text with markdown
 * @returns {string} HTML string
 */
export function parseMarkdown(text) {
  if (!text) return '';

  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Lists
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

/**
 * Highlight search terms in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} HTML with highlighted terms
 */
export function highlightText(text, query) {
  if (!query?.trim() || !text) return text;

  const terms = query.split(/\s+/).filter(Boolean);
  let result = text;

  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }

  return result;
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get status color for health status
 * @param {string} status - Health status
 * @returns {string} CSS color class
 */
export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'ok':
    case 'completed':
    case 'success':
      return 'status-success';
    case 'degraded':
    case 'warning':
    case 'processing':
      return 'status-warning';
    case 'unhealthy':
    case 'error':
    case 'failed':
      return 'status-error';
    default:
      return 'status-neutral';
  }
}

/**
 * Classify document by type
 * @param {string} filename - Filename to classify
 * @returns {string} Document type
 */
export function classifyDocumentType(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'PDF Document';
    case 'docx':
    case 'doc':
      return 'Word Document';
    case 'txt':
      return 'Text File';
    case 'md':
      return 'Markdown';
    default:
      return 'Document';
  }
}

/**
 * Group items by key
 * @param {Array} items - Items to group
 * @param {string|Function} key - Key or getter function
 * @returns {Object} Grouped items
 */
export function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const group = typeof key === 'function' ? key(item) : item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
}

/**
 * Sort items by key
 * @param {Array} items - Items to sort
 * @param {string} key - Sort key
 * @param {'asc'|'desc'} [order='asc'] - Sort order
 * @returns {Array} Sorted items
 */
export function sortBy(items, key, order = 'asc') {
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'desc' ? -cmp : cmp;
  });
}
