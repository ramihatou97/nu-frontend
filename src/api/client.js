/**
 * NeuroSynth API Client
 *
 * Complete frontend API client with 100% backend parity.
 * All endpoints, schemas, and error handling aligned with FastAPI backend.
 *
 * @version 2.0.0
 * @author NeuroSynth Team
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE = '';  // Proxy handles /api/* routes
const DEFAULT_TIMEOUT = 30000;  // 30 seconds
const STREAM_TIMEOUT = 120000;  // 2 minutes for streaming

// =============================================================================
// TYPE DEFINITIONS (JSDoc)
// =============================================================================

/**
 * @typedef {'quantitative'|'contradictory'|'approach'|'temporal'} ConflictType
 * Types of conflicts detected in synthesis sources:
 * - quantitative: Numerical disagreements (e.g., 15% vs 25%)
 * - contradictory: Direct statement contradictions
 * - approach: Different recommended techniques
 * - temporal: Outdated vs current information
 */

/**
 * @typedef {Object} ConflictItem
 * @property {ConflictType} type - Type of conflict
 * @property {string} description - Description of the conflict (e.g., "15% vs 25%")
 * @property {string} source_a - First conflicting source
 * @property {string} source_b - Second conflicting source
 * @property {string} section - Section where conflict was detected
 * @property {'low'|'medium'|'high'} severity - Severity level
 * @property {string} [context_a] - Context from first source
 * @property {string} [context_b] - Context from second source
 */

/**
 * @typedef {Object} ConflictReport
 * @property {number} count - Total number of conflicts
 * @property {'heuristic'|'llm'} mode - Detection mode used
 * @property {number} sections_analyzed - Number of sections analyzed
 * @property {Object<string, number>} by_type - Conflicts by type
 * @property {Object<string, number>} by_severity - Conflicts by severity
 * @property {ConflictItem[]} conflicts - List of detected conflicts
 */

/**
 * @typedef {Object} SynthesisResponse
 * @property {string} title - Synthesis title
 * @property {string} abstract - Abstract text
 * @property {Array} sections - Generated sections
 * @property {Array} references - Source references
 * @property {Array} figure_requests - Figure placeholders
 * @property {Array} resolved_figures - Resolved figures
 * @property {number} total_words - Total word count
 * @property {number} total_figures - Total figure count
 * @property {number} total_citations - Total citation count
 * @property {number} synthesis_time_ms - Generation time in ms
 * @property {number|null} verification_score - Optional verification score
 * @property {string[]} verification_issues - Verification issues found
 * @property {boolean} verified - Whether verified
 * @property {number} conflict_count - Number of detected conflicts
 * @property {ConflictReport|null} conflict_report - Detailed conflict report
 */

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Custom API Error with structured details.
 */
class APIError extends Error {
  constructor(message, status, detail = null, validationErrors = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.detail = detail;
    this.validationErrors = validationErrors;
    this.isValidationError = status === 422;
    this.isNotFound = status === 404;
    this.isUnauthorized = status === 401;
    this.isRateLimited = status === 429;
    this.isServerError = status >= 500;
  }
}

/**
 * Parse error response from backend.
 * Handles Pydantic validation errors (422) with field-specific messages.
 */
async function parseErrorResponse(response) {
  let errorData = {};

  try {
    errorData = await response.json();
  } catch {
    // Response wasn't JSON
  }

  // Handle Pydantic validation errors (422)
  if (response.status === 422 && errorData.detail) {
    const validationErrors = errorData.detail;

    if (Array.isArray(validationErrors)) {
      // Format: [{"loc": ["body", "field"], "msg": "error", "type": "error_type"}]
      const messages = validationErrors.map(err => {
        const field = err.loc?.slice(1).join('.') || 'unknown';
        return `${field}: ${err.msg}`;
      });

      return new APIError(
        `Validation error: ${messages.join('; ')}`,
        422,
        errorData,
        validationErrors
      );
    }
  }

  // Standard error format
  const message = errorData.detail?.message
    || errorData.detail
    || errorData.message
    || `Request failed (${response.status})`;

  return new APIError(message, response.status, errorData);
}

// =============================================================================
// BASE REQUEST FUNCTIONS
// =============================================================================

/**
 * Build query string from params object.
 * Filters out null/undefined values.
 */
function buildQueryString(params) {
  const entries = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return v.map(item => `${encodeURIComponent(k)}=${encodeURIComponent(item)}`).join('&');
      }
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    });

  return entries.length ? '?' + entries.join('&') : '';
}

/**
 * Make HTTP request with error handling.
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  try {
    const headers = { ...options.headers };

    // Set Content-Type for JSON body (not FormData)
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(API_BASE + path, {
      ...options,
      headers,
      body: options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
      signal: options.signal || controller.signal
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    // Handle different response types
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    if (contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream') ||
        contentType.includes('application/vnd.openxmlformats')) {
      return response.blob();
    }

    return response.text();

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error.message || 'Network error', 0);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Stream SSE (Server-Sent Events) with proper event handling.
 * Returns abort function.
 */
function streamSSE(path, body, handlers) {
  const controller = new AbortController();

  fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await parseErrorResponse(response);
        handlers.onError?.(error);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();

              if (dataStr) {
                try {
                  const data = JSON.parse(dataStr);

                  // Dispatch to appropriate handler
                  switch (currentEvent) {
                    case 'token':
                      handlers.onToken?.(data.token);
                      break;
                    case 'citation':
                      handlers.onCitation?.(data);
                      break;
                    case 'image':
                      handlers.onImage?.(data);
                      break;
                    case 'stage':
                      handlers.onStage?.(data);
                      break;
                    case 'section':
                      handlers.onSection?.(data);
                      break;
                    case 'progress':
                      handlers.onProgress?.(data);
                      break;
                    case 'done':
                      handlers.onDone?.(data);
                      break;
                    case 'error':
                      handlers.onError?.(new APIError(data.message || 'Stream error', 500));
                      break;
                    default:
                      handlers.onData?.(currentEvent, data);
                  }
                } catch (e) {
                  // Non-JSON data, pass as raw
                  handlers.onData?.(currentEvent, dataStr);
                }
              }
            }
          }
        }

        handlers.onComplete?.();

      } catch (error) {
        if (error.name !== 'AbortError') {
          handlers.onError?.(error);
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        handlers.onError?.(error);
      }
    });

  // Return abort function
  return () => {
    controller.abort();
    handlers.onAbort?.();
  };
}

// =============================================================================
// API CLIENT - 54 ENDPOINTS
// =============================================================================

export const api = {

  // ===========================================================================
  // INGESTION (4 endpoints)
  // ===========================================================================

  /**
   * Upload PDF files for ingestion.
   * POST /api/v1/ingest/upload
   */
  uploadFiles: (files, config = {}) => {
    const formData = new FormData();

    // Add file (singular - backend expects 'file' not 'files')
    const fileArray = Array.isArray(files) ? files : [files];
    formData.append('file', fileArray[0]);

    // Add individual form fields (backend expects Form fields, not JSON)
    if (config.title) formData.append('title', config.title);
    formData.append('extract_images', config.extract_images ?? true);
    formData.append('extract_tables', config.extract_tables ?? true);
    formData.append('detect_sections', config.detect_sections ?? true);
    formData.append('generate_embeddings', config.generate_embeddings ?? true);
    formData.append('vlm_captioning', config.vlm_captioning ?? true);

    return request('/api/v1/ingest/upload', {
      method: 'POST',
      body: formData,
      timeout: 300000  // 5 minutes for large uploads
    });
  },

  /**
   * Get ingestion job status.
   * GET /api/v1/ingest/status/{job_id}
   */
  getIngestStatus: (jobId) =>
    request(`/api/v1/ingest/status/${jobId}`),

  /**
   * Get ingestion history.
   * GET /api/v1/ingest/history
   */
  getIngestHistory: (params = {}) =>
    request(`/api/v1/ingest/history${buildQueryString({
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      status: params.status
    })}`),

  /**
   * Cancel in-progress ingestion.
   * POST /api/v1/ingest/cancel/{job_id}
   */
  cancelIngest: (jobId) =>
    request(`/api/v1/ingest/cancel/${jobId}`, { method: 'POST' }),

  /**
   * Upload multiple PDFs for batch processing.
   * POST /api/v1/ingest/upload-batch
   */
  uploadBatch: async (files, config = {}) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    if (config.titlePrefix) formData.append('title_prefix', config.titlePrefix);
    formData.append('extract_images', config.extractImages ?? true);
    formData.append('extract_tables', config.extractTables ?? true);
    formData.append('detect_sections', config.detectSections ?? true);
    formData.append('generate_embeddings', config.generateEmbeddings ?? true);
    formData.append('vlm_captioning', config.vlmCaptioning ?? true);
    formData.append('chunk_size', config.chunkSize ?? 500);
    formData.append('chunk_overlap', config.chunkOverlap ?? 50);

    return request('/api/v1/ingest/upload-batch', {
      method: 'POST',
      body: formData,
      timeout: 300000  // 5 minutes for batch upload
    });
  },

  /**
   * Get batch processing status.
   * GET /api/v1/ingest/batch/{batch_id}/status
   */
  getBatchStatus: (batchId) =>
    request(`/api/v1/ingest/batch/${batchId}/status`),

  /**
   * Cancel a running batch.
   * POST /api/v1/ingest/batch/{batch_id}/cancel
   */
  cancelBatch: (batchId) =>
    request(`/api/v1/ingest/batch/${batchId}/cancel`, { method: 'POST' }),

  /**
   * Retry failed jobs in a batch.
   * POST /api/v1/ingest/batch/{batch_id}/retry-failed
   */
  retryFailedJobs: (batchId) =>
    request(`/api/v1/ingest/batch/${batchId}/retry-failed`, { method: 'POST' }),

  // ===========================================================================
  // SEARCH (4 endpoints)
  // ===========================================================================

  /**
   * Hybrid semantic search.
   * POST /api/v1/search
   */
  search: (params) =>
    request('/api/v1/search', {
      method: 'POST',
      body: {
        query: params.query,
        mode: params.mode || 'hybrid',  // 'hybrid', 'text', 'image'
        top_k: params.top_k ?? params.limit ?? 20,
        filters: params.filters ? {
          chunk_types: params.filters.chunk_types,
          specialties: params.filters.specialties,
          document_ids: params.filters.document_ids,
          min_authority: params.filters.min_authority,
          min_quality: params.filters.min_quality,
          page_range: (params.filters.min_page || params.filters.max_page)
            ? [params.filters.min_page || 1, params.filters.max_page || 9999]
            : undefined
        } : undefined,
        advanced: params.advanced ? {
          nprobe: params.advanced.nprobe ?? 10,
          use_rerank: params.advanced.use_rerank ?? true,
          cui_boost: params.advanced.cui_boost ?? 0.15
        } : undefined
      }
    }),

  /**
   * Autocomplete suggestions.
   * GET /api/v1/search/suggest
   */
  searchSuggest: (q, params = {}) =>
    request(`/api/v1/search/suggest${buildQueryString({
      q,
      limit: params.limit ?? 10,
      types: params.types  // 'entity,document,query'
    })}`),

  /**
   * Quick lightweight search.
   * GET /api/v1/search/quick
   */
  searchQuick: (q, limit = 5) =>
    request(`/api/v1/search/quick${buildQueryString({ q, limit })}`),

  /**
   * Find similar chunks.
   * GET /api/v1/search/similar/{chunk_id}
   */
  searchSimilar: (chunkId, params = {}) =>
    request(`/api/v1/search/similar/${chunkId}${buildQueryString({
      top_k: params.top_k ?? 10,
      same_document: params.same_document ?? false
    })}`),

  // ===========================================================================
  // RAG Q&A (8 endpoints)
  // ===========================================================================

  /**
   * Answer question with RAG.
   * POST /api/v1/rag/ask
   */
  ask: (params) =>
    request('/api/v1/rag/ask', {
      method: 'POST',
      body: {
        question: params.question,
        question_type: params.question_type || 'general',
        max_context_chunks: params.max_chunks ?? params.context_chunks ?? 20,
        include_citations: params.include_citations ?? true,
        include_images: params.include_images ?? true,
        filters: params.document_ids
          ? { document_ids: params.document_ids }
          : params.filters,
        conversation_id: params.conversation_id
      },
      timeout: 60000  // 60 seconds for RAG
    }),

  /**
   * Streaming RAG response.
   * POST /api/v1/rag/ask/stream
   */
  askStream: (params, handlers) =>
    streamSSE('/api/v1/rag/ask/stream', {
      question: params.question,
      question_type: params.question_type || 'general',
      max_context_chunks: params.max_chunks ?? params.context_chunks ?? 20,
      include_citations: params.include_citations ?? true,
      include_images: params.include_images ?? true,
      filters: params.document_ids
        ? { document_ids: params.document_ids }
        : params.filters,
      conversation_id: params.conversation_id
    }, handlers),

  /**
   * Get conversation by ID.
   * GET /api/v1/rag/conversation/{id}
   */
  getConversation: (conversationId) =>
    request(`/api/v1/rag/conversation/${conversationId}`),

  /**
   * Delete conversation.
   * DELETE /api/v1/rag/conversation/{id}
   */
  deleteConversation: (conversationId) =>
    request(`/api/v1/rag/conversation/${conversationId}`, { method: 'DELETE' }),

  /**
   * Get conversation history list.
   * GET /api/v1/rag/history
   */
  getConversationHistory: (params = {}) =>
    request(`/api/v1/rag/history${buildQueryString({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      sort_by: params.sort_by ?? 'updated_at',
      sort_order: params.sort_order ?? 'desc'
    })}`),

  /**
   * Clear conversations.
   * POST /api/v1/rag/clear
   */
  clearConversations: (params = {}) =>
    request('/api/v1/rag/clear', {
      method: 'POST',
      body: {
        before: params.before,
        conversation_ids: params.conversation_ids
      }
    }),

  /**
   * Multi-turn conversation with context persistence.
   * POST /api/v1/rag/conversation
   *
   * @param {Object} params
   * @param {string} params.message - User message
   * @param {string} [params.conversation_id] - Existing conversation ID (omit to start new)
   * @param {Object} [params.filters] - Search filters
   * @returns {Promise<{conversation_id: string, answer: string, citations: Array, history_length: number}>}
   */
  sendConversation: (params) =>
    request('/api/v1/rag/conversation', {
      method: 'POST',
      body: {
        message: params.message,
        conversation_id: params.conversation_id,
        filters: params.filters
      },
      timeout: 60000
    }),

  /**
   * Get RAG context without answer.
   * POST /api/v1/rag/context
   */
  getContext: (question, params = {}) =>
    request(`/api/v1/rag/context${buildQueryString({
      question,
      max_chunks: params.max_chunks ?? 20,
      document_ids: params.document_ids
    })}`),

  /**
   * Summarize document.
   * GET /api/v1/rag/summarize/{document_id}
   */
  summarizeDocument: (documentId, maxLength = 500) =>
    request(`/api/v1/rag/summarize/${documentId}${buildQueryString({
      max_length: maxLength
    })}`),

  /**
   * Compare surgical approaches.
   * POST /api/v1/rag/compare
   */
  compareApproaches: (params) =>
    request('/api/v1/rag/compare', {
      method: 'POST',
      body: {
        approach_a: params.approach_a,
        approach_b: params.approach_b,
        aspects: params.aspects ?? ['indications', 'technique', 'complications', 'outcomes'],
        max_chunks: params.max_chunks ?? 30
      }
    }),

  // ===========================================================================
  // DOCUMENTS (10 endpoints)
  // ===========================================================================

  /**
   * List documents.
   * GET /api/v1/documents
   */
  getDocuments: (params = {}) =>
    request(`/api/v1/documents${buildQueryString({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      specialty: params.specialty,
      sort_by: params.sort_by ?? 'ingested_at',
      sort_order: params.sort_order ?? 'desc'
    })}`),

  /**
   * Get document by ID.
   * GET /api/v1/documents/{id}
   */
  getDocument: (id) =>
    request(`/api/v1/documents/${id}`),

  /**
   * Get document chunks.
   * GET /api/v1/documents/{id}/chunks
   */
  getDocumentChunks: (id, params = {}) =>
    request(`/api/v1/documents/${id}/chunks${buildQueryString({
      page: params.page ?? 1,
      page_size: params.page_size ?? 50,
      chunk_type: params.chunk_type
    })}`),

  /**
   * Get document images.
   * GET /api/v1/documents/{id}/images
   */
  getDocumentImages: (id, params = {}) =>
    request(`/api/v1/documents/${id}/images${buildQueryString({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      image_type: params.image_type
    })}`),

  /**
   * Get document statistics.
   * GET /api/v1/documents/{id}/stats
   */
  getDocumentStats: (id) =>
    request(`/api/v1/documents/${id}/stats`),

  /**
   * Update document metadata.
   * PATCH /api/v1/documents/{id}
   */
  updateDocument: (id, update) =>
    request(`/api/v1/documents/${id}`, {
      method: 'PATCH',
      body: {
        title: update.title,
        author: update.author,
        specialty: update.specialty,
        authority_score: update.authority_score,
        metadata: update.metadata
      }
    }),

  /**
   * Delete document.
   * DELETE /api/v1/documents/{id}
   */
  deleteDocument: (id) =>
    request(`/api/v1/documents/${id}`, { method: 'DELETE' }),

  /**
   * Bulk delete documents.
   * DELETE /api/v1/documents
   */
  bulkDeleteDocuments: (documentIds, cascade = true) =>
    request('/api/v1/documents', {
      method: 'DELETE',
      body: {
        ids: documentIds,
        cascade
      }
    }),

  /**
   * Delete all documents.
   * DELETE /api/v1/documents/all?confirm=true
   */
  deleteAllDocuments: (confirm = false) =>
    request(`/api/v1/documents/all${buildQueryString({ confirm })}`, {
      method: 'DELETE'
    }),

  /**
   * Reindex document.
   * POST /api/v1/documents/{id}/reindex
   */
  reindexDocument: (id) =>
    request(`/api/v1/documents/${id}/reindex`, { method: 'POST' }),

  // ===========================================================================
  // ENTITIES (7 endpoints)
  // ===========================================================================

  /**
   * List entities.
   * GET /api/v1/entities
   */
  getEntities: (params = {}) =>
    request(`/api/v1/entities${buildQueryString({
      page: params.page ?? 1,
      page_size: params.page_size ?? 50,
      semantic_type: params.semantic_type,
      min_occurrences: params.min_occurrences ?? 0,
      sort_by: params.sort_by ?? 'occurrence_count',
      sort_order: params.sort_order ?? 'desc'
    })}`),

  /**
   * Search entities.
   * GET /api/v1/entities/search
   */
  searchEntities: (q, params = {}) =>
    request(`/api/v1/entities/search${buildQueryString({
      q,
      limit: params.limit ?? 20,
      semantic_type: params.semantic_type
    })}`),

  /**
   * Get entity by CUI.
   * GET /api/v1/entities/{cui}
   */
  getEntity: (cui) =>
    request(`/api/v1/entities/${encodeURIComponent(cui)}`),

  /**
   * Get entity knowledge graph.
   * GET /api/v1/entities/graph?cui={cui}&depth={depth}
   */
  getEntityGraph: (cui, params = {}) =>
    request(`/api/v1/entities/graph${buildQueryString({
      cui,
      depth: params.depth ?? 1,
      max_nodes: params.max_nodes ?? 50
    })}`),

  /**
   * Delete entity by CUI.
   * DELETE /api/v1/entities/cui/{cui}
   */
  deleteEntity: (cui) =>
    request(`/api/v1/entities/cui/${encodeURIComponent(cui)}`, { method: 'DELETE' }),

  /**
   * Bulk delete entities by CUI.
   * DELETE /api/v1/entities/by-cui
   */
  bulkDeleteEntities: (cuis) =>
    request('/api/v1/entities/by-cui', {
      method: 'DELETE',
      body: { cuis }
    }),

  /**
   * Delete all entities.
   * DELETE /api/v1/entities/all?confirm=true
   */
  deleteAllEntities: (confirm = false) =>
    request(`/api/v1/entities/all${buildQueryString({ confirm })}`, {
      method: 'DELETE'
    }),

  // ===========================================================================
  // SYNTHESIS (5 endpoints)
  // ===========================================================================

  /**
   * Get synthesis templates.
   * GET /api/synthesis/templates
   */
  getTemplates: () =>
    request('/api/synthesis/templates'),

  /**
   * Generate textbook chapter.
   * POST /api/synthesis/generate
   */
  generateChapter: (params) =>
    request('/api/synthesis/generate', {
      method: 'POST',
      body: {
        topic: params.topic,
        template_type: params.template_type ?? 'PROCEDURAL',
        max_chunks: params.max_chunks ?? 50,
        include_figures: params.include_figures ?? true,
        gemini_verification: params.gemini_verification ?? false,
        author: params.author,
        institution: params.institution
      },
      timeout: 120000  // 2 minutes
    }),

  /**
   * Streaming synthesis.
   * POST /api/synthesis/generate/stream
   */
  generateChapterStream: (params, handlers) => {
    // Return the abort function from streamSSE
    return streamSSE('/api/synthesis/generate/stream', {
      topic: params.topic,
      template_type: params.template_type ?? 'PROCEDURAL',
      max_chunks: params.max_chunks ?? 50,
      include_figures: params.include_figures ?? true,
      gemini_verification: params.gemini_verification ?? false,
      author: params.author,
      institution: params.institution
    }, handlers);
  },

  /**
   * Check synthesis service health.
   * GET /api/synthesis/health
   */
  getSynthesisHealth: () =>
    request('/api/synthesis/health'),

  // ===========================================================================
  // EXPORT (4 endpoints)
  // ===========================================================================

  /**
   * Export to PDF.
   * POST /api/synthesis/export/pdf
   */
  exportPDF: (params) =>
    request('/api/synthesis/export/pdf', {
      method: 'POST',
      body: {
        topic: params.topic,
        synthesis_id: params.synthesis_id,
        template_type: params.template_type ?? 'PROCEDURAL',
        title: params.title || params.topic,
        author: params.author ?? 'NeuroSynth',
        institution: params.institution,
        image_quality: params.image_quality ?? 'high',
        include_toc: params.include_toc ?? true,
        include_abstract: params.include_abstract ?? true,
        include_references: params.include_references ?? true,
        include_figures: params.include_figures ?? true,
        image_dpi: params.image_dpi ?? 300
      },
      timeout: 120000
    }),

  /**
   * Export to HTML.
   * POST /api/synthesis/export/html
   */
  exportHTML: (params) =>
    request('/api/synthesis/export/html', {
      method: 'POST',
      body: {
        topic: params.topic,
        synthesis_id: params.synthesis_id,
        template_type: params.template_type ?? 'PROCEDURAL',
        title: params.title || params.topic,
        author: params.author ?? 'NeuroSynth',
        institution: params.institution,
        image_quality: params.image_quality ?? 'high',
        include_toc: params.include_toc ?? true,
        include_abstract: params.include_abstract ?? true,
        include_references: params.include_references ?? true,
        include_figures: params.include_figures ?? true
      },
      timeout: 120000
    }),

  /**
   * Export to DOCX.
   * POST /api/synthesis/export/docx
   */
  exportDOCX: (params) =>
    request('/api/synthesis/export/docx', {
      method: 'POST',
      body: {
        topic: params.topic,
        synthesis_id: params.synthesis_id,
        template_type: params.template_type ?? 'PROCEDURAL',
        title: params.title || params.topic,
        author: params.author ?? 'NeuroSynth',
        institution: params.institution,
        image_quality: params.image_quality ?? 'high',
        include_toc: params.include_toc ?? true,
        include_abstract: params.include_abstract ?? true,
        include_references: params.include_references ?? true,
        include_figures: params.include_figures ?? true
      },
      timeout: 120000
    }),

  /**
   * Export to Markdown.
   * POST /api/synthesis/export/markdown
   */
  exportMarkdown: (params) =>
    request('/api/synthesis/export/markdown', {
      method: 'POST',
      body: {
        topic: params.topic,
        synthesis_id: params.synthesis_id,
        template_type: params.template_type ?? 'PROCEDURAL',
        title: params.title || params.topic,
        author: params.author ?? 'NeuroSynth',
        institution: params.institution,
        include_toc: params.include_toc ?? true,
        include_abstract: params.include_abstract ?? true,
        include_references: params.include_references ?? true,
        include_figures: params.include_figures ?? true
      },
      timeout: 120000
    }),

  // ===========================================================================
  // INDEXES (4 endpoints)
  // ===========================================================================

  /**
   * Rebuild indexes.
   * POST /api/v1/indexes/rebuild
   */
  rebuildIndexes: (params = {}) =>
    request('/api/v1/indexes/rebuild', {
      method: 'POST',
      body: {
        index_type: params.index_type ?? 'all',  // 'all', 'text', 'image', 'caption'
        force: params.force ?? false
      }
    }),

  /**
   * Rebuild specific index.
   * POST /api/v1/indexes/rebuild/{type}
   */
  rebuildIndex: (type) =>
    request(`/api/v1/indexes/rebuild/${type}`, { method: 'POST' }),

  /**
   * Get rebuild job status.
   * GET /api/v1/indexes/rebuild/status/{job_id}
   */
  getIndexRebuildStatus: (jobId) =>
    request(`/api/v1/indexes/rebuild/status/${jobId}`),

  /**
   * Get index statistics.
   * GET /api/v1/indexes/stats
   */
  getIndexStats: () =>
    request('/api/v1/indexes/stats'),

  // ===========================================================================
  // HEALTH (6 endpoints)
  // ===========================================================================

  /**
   * Basic health check.
   * GET /api/v1/health
   */
  getHealth: () =>
    request('/api/v1/health'),

  /**
   * Kubernetes liveness probe.
   * GET /api/v1/health/live
   */
  getLiveness: () =>
    request('/api/v1/health/live'),

  /**
   * Kubernetes readiness probe.
   * GET /api/v1/health/ready
   */
  getReadiness: () =>
    request('/api/v1/health/ready'),

  /**
   * System statistics.
   * GET /api/v1/stats
   */
  getStats: () =>
    request('/api/v1/stats'),

  /**
   * API rate limits.
   * GET /api/v1/rate-limits
   */
  getRateLimits: () =>
    request('/api/v1/rate-limits'),

  /**
   * System info/metadata.
   * GET /api/v1/info
   */
  getInfo: () =>
    request('/api/v1/info'),

  // ===========================================================================
  // KNOWLEDGE GRAPH (6 endpoints)
  // ===========================================================================

  /**
   * Get entity with relationships.
   * GET /api/v1/knowledge-graph/entity/{name}
   */
  getKnowledgeGraphEntity: (name, params = {}) =>
    request(`/api/v1/knowledge-graph/entity/${encodeURIComponent(name)}${buildQueryString({
      hop_limit: params.hop_limit ?? 1,
    })}`),

  /**
   * Traverse graph from multiple entities.
   * POST /api/v1/knowledge-graph/traverse
   */
  traverseKnowledgeGraph: (params) =>
    request('/api/v1/knowledge-graph/traverse', {
      method: 'POST',
      body: {
        entities: params.entities,
        hop_limit: params.hop_limit ?? 2,
        relation_types: params.relation_types,
        min_confidence: params.min_confidence ?? 0.5,
      }
    }),

  /**
   * Get graph visualization in Cytoscape.js format.
   * GET /api/v1/knowledge-graph/visualization/{name}
   */
  getKnowledgeGraphVisualization: (name, params = {}) =>
    request(`/api/v1/knowledge-graph/visualization/${encodeURIComponent(name)}${buildQueryString({
      hop_limit: params.hop_limit ?? 2,
      max_nodes: params.max_nodes ?? 50,
    })}`),

  /**
   * Get graph statistics.
   * GET /api/v1/knowledge-graph/stats
   */
  getKnowledgeGraphStats: () =>
    request('/api/v1/knowledge-graph/stats'),

  /**
   * Search entities in knowledge graph.
   * GET /api/v1/knowledge-graph/search
   */
  searchKnowledgeGraph: (q, params = {}) =>
    request(`/api/v1/knowledge-graph/search${buildQueryString({
      q,
      limit: params.limit ?? 20,
    })}`),

  /**
   * Get available relation types.
   * GET /api/v1/knowledge-graph/relation-types
   */
  getRelationTypes: () =>
    request('/api/v1/knowledge-graph/relation-types'),

  // ===========================================================================
  // IMAGES (1 endpoint)
  // ===========================================================================

  /**
   * Get image URL.
   * Returns URL string, not a fetch call.
   */
  getImageUrl: (imageId) =>
    `/images/${imageId}`,

  /**
   * Fetch image as blob.
   * GET /images/{id}
   */
  getImage: (imageId) =>
    request(`/images/${imageId}`),

  // ===========================================================================
  // AUTHORITY REGISTRY (7 endpoints)
  // ===========================================================================

  /**
   * Get all authority sources with scores.
   * GET /api/v1/registry
   */
  getRegistry: () =>
    request('/api/v1/registry'),

  /**
   * Update authority score for a source.
   * PUT /api/v1/registry/score
   */
  updateRegistryScore: (source, score) =>
    request('/api/v1/registry/score', {
      method: 'PUT',
      body: { source, score }
    }),

  /**
   * Add a custom authority source.
   * POST /api/v1/registry/custom
   */
  addCustomSource: (data) =>
    request('/api/v1/registry/custom', {
      method: 'POST',
      body: {
        name: data.name,
        score: data.score,
        keywords: data.keywords,
        tier: data.tier ?? 3
      }
    }),

  /**
   * Remove a custom authority source.
   * DELETE /api/v1/registry/custom/{name}
   */
  removeCustomSource: (name) =>
    request(`/api/v1/registry/custom/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    }),

  /**
   * Detect authority source from document title.
   * POST /api/v1/registry/detect
   */
  detectAuthority: (title) =>
    request('/api/v1/registry/detect', {
      method: 'POST',
      body: { title }
    }),

  /**
   * Reset registry to default values.
   * POST /api/v1/registry/reset
   */
  resetRegistry: () =>
    request('/api/v1/registry/reset', { method: 'POST' }),

  /**
   * Get tier definitions with sources.
   * GET /api/v1/registry/tiers
   */
  getRegistryTiers: () =>
    request('/api/v1/registry/tiers'),

  // ===========================================================================
  // ENHANCED CHAT (9 endpoints)
  // ===========================================================================

  /**
   * Ask question with enhanced chat (citations, token tracking).
   * POST /api/v1/chat/ask
   */
  chatAsk: (params) =>
    request('/api/v1/chat/ask', {
      method: 'POST',
      body: {
        message: params.message,
        conversation_id: params.conversation_id,
        synthesis_id: params.synthesis_id,
        filters: params.filters,
        include_citations: params.include_citations ?? true,
        include_images: params.include_images ?? true,
        max_context_chunks: params.max_context_chunks ?? 10,
        max_history_tokens: params.max_history_tokens ?? 4000
      },
      timeout: 60000
    }),

  /**
   * Stream chat response via SSE.
   * POST /api/v1/chat/ask/stream
   */
  chatAskStream: (params, handlers) =>
    streamSSE('/api/v1/chat/ask/stream', {
      message: params.message,
      conversation_id: params.conversation_id,
      synthesis_id: params.synthesis_id,
      filters: params.filters,
      include_citations: params.include_citations ?? true,
      include_images: params.include_images ?? true,
      max_context_chunks: params.max_context_chunks ?? 10,
      max_history_tokens: params.max_history_tokens ?? 4000
    }, handlers),

  /**
   * Link conversation to synthesis result.
   * POST /api/v1/chat/link-synthesis
   */
  linkSynthesis: (conversationId, synthesisId) =>
    request('/api/v1/chat/link-synthesis', {
      method: 'POST',
      body: {
        conversation_id: conversationId,
        synthesis_id: synthesisId
      }
    }),

  /**
   * List recent chat conversations.
   * GET /api/v1/chat/conversations
   */
  getChatConversations: (limit = 20) =>
    request(`/api/v1/chat/conversations${buildQueryString({ limit })}`),

  /**
   * Get full chat conversation history.
   * GET /api/v1/chat/conversations/{id}
   */
  getChatConversation: (conversationId) =>
    request(`/api/v1/chat/conversations/${conversationId}`),

  /**
   * Delete a chat conversation.
   * DELETE /api/v1/chat/conversations/{id}
   */
  deleteChatConversation: (conversationId) =>
    request(`/api/v1/chat/conversations/${conversationId}`, { method: 'DELETE' }),

  /**
   * Clear chat conversation history but keep metadata.
   * POST /api/v1/chat/conversations/{id}/clear
   */
  clearChatConversation: (conversationId) =>
    request(`/api/v1/chat/conversations/${conversationId}/clear`, { method: 'POST' }),

  /**
   * Get chat store backend info.
   * GET /api/v1/chat/store-info
   */
  getChatStoreInfo: () =>
    request('/api/v1/chat/store-info'),

  /**
   * Chat subsystem health check.
   * GET /api/v1/chat/health
   */
  getChatHealth: () =>
    request('/api/v1/chat/health'),

  // ===========================================================================
  // MEMORY-SAFE INGESTION (3 endpoints)
  // ===========================================================================

  /**
   * Upload PDF with memory-safe processing.
   * POST /api/v1/ingest/memory-safe/upload
   */
  memorySafeUpload: (file, config = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    if (config.title) formData.append('title', config.title);
    formData.append('force_subprocess', config.force_subprocess ?? false);
    formData.append('enable_scispacy', config.enable_scispacy ?? true);
    formData.append('enable_biomedclip', config.enable_biomedclip ?? true);

    return request('/api/v1/ingest/memory-safe/upload', {
      method: 'POST',
      body: formData,
      timeout: 300000
    });
  },

  /**
   * Get memory usage statistics.
   * GET /api/v1/ingest/memory-safe/memory-stats
   */
  getMemoryStats: () =>
    request('/api/v1/ingest/memory-safe/memory-stats'),

  /**
   * Force unload all loaded models.
   * POST /api/v1/ingest/memory-safe/unload-all
   */
  unloadAllModels: () =>
    request('/api/v1/ingest/memory-safe/unload-all', { method: 'POST' }),

  // ===========================================================================
  // DOCUMENT CHUNK/IMAGE DELETION (2 endpoints)
  // ===========================================================================

  /**
   * Delete document chunks.
   * DELETE /api/v1/documents/{id}/chunks
   */
  deleteDocumentChunks: (documentId, chunkIds = null) =>
    request(`/api/v1/documents/${documentId}/chunks${chunkIds ? buildQueryString({ chunk_ids: chunkIds }) : ''}`, {
      method: 'DELETE'
    }),

  /**
   * Delete document images.
   * DELETE /api/v1/documents/{id}/images
   */
  deleteDocumentImages: (documentId, imageIds = null) =>
    request(`/api/v1/documents/${documentId}/images${imageIds ? buildQueryString({ image_ids: imageIds }) : ''}`, {
      method: 'DELETE'
    }),

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Download blob as file.
   */
  downloadBlob: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Download text as file.
   */
  downloadText: (text, filename, mimeType = 'text/plain') => {
    const blob = new Blob([text], { type: mimeType });
    api.downloadBlob(blob, filename);
  },

  // ===========================================================================
  // LEGACY COMPATIBILITY LAYER
  // ===========================================================================
  // These methods provide backward compatibility with the old class-based API

  /** @deprecated Use uploadFiles instead */
  ingestUpload: (file, config) => api.uploadFiles(file, config),

  /** @deprecated Use getIngestStatus instead */
  ingestStatus: (jobId) => api.getIngestStatus(jobId),

  /** @deprecated Use getIngestHistory instead */
  ingestJobs: () => api.getIngestHistory(),

  /** @deprecated Use cancelIngest instead */
  ingestCancel: (jobId) => api.cancelIngest(jobId),

  /** @deprecated Use ask instead */
  ragAsk: (question, options = {}) => api.ask({ question, ...options }),

  /** @deprecated Use askStream instead */
  ragStream: (question, options, onChunk) =>
    api.askStream({ question, ...options }, { onToken: onChunk }),

  /** @deprecated Use getConversationHistory instead */
  ragHistory: (sessionId) => api.getConversationHistory({ session_id: sessionId }),

  /** @deprecated Use clearConversations instead */
  ragClear: (sessionId) => api.clearConversations({ conversation_ids: sessionId ? [sessionId] : undefined }),

  /** @deprecated Use getContext instead */
  ragContext: (question) => api.getContext(question),

  /** @deprecated Use getDocuments instead */
  documentsList: (options = {}) => api.getDocuments({
    page: options.skip ? Math.floor(options.skip / (options.limit || 20)) + 1 : 1,
    page_size: options.limit || 20,
    sort_by: options.sort_by
  }),

  /** @deprecated Use getDocument instead */
  documentsGet: (docId) => api.getDocument(docId),

  /** @deprecated Use deleteDocument instead */
  documentsDelete: (docId) => api.deleteDocument(docId),

  /** @deprecated Use bulkDeleteDocuments instead */
  documentsBulkDelete: (docIds) => api.bulkDeleteDocuments(docIds),

  /** @deprecated Use getDocumentChunks instead */
  documentsChunks: (docId) => api.getDocumentChunks(docId),

  /** @deprecated Use updateDocument instead */
  documentsUpdate: (docId, metadata) => api.updateDocument(docId, metadata),

  /** @deprecated Use getEntities instead */
  entitiesList: (options = {}) => api.getEntities(options),

  /** @deprecated Use searchEntities instead */
  entitiesSearch: (query, type) => api.searchEntities(query, { semantic_type: type }),

  /** @deprecated Use getEntity instead */
  entitiesGet: (cui) => api.getEntity(cui),

  /** @deprecated Use getEntityGraph instead */
  entitiesGraph: (cui, depth = 2) => api.getEntityGraph(cui, { depth }),

  /** @deprecated Use generateChapter instead */
  synthesisGenerate: (params) => api.generateChapter(params),

  /** @deprecated Use generateChapterStream instead */
  synthesisStream: (params, onChunk) =>
    api.generateChapterStream(params, { onToken: onChunk }),

  /** @deprecated Use getHealth instead */
  health: () => api.getHealth(),

  /** @deprecated Use getHealth instead */
  healthDetailed: () => api.getHealth(),

  /** @deprecated Use getStats instead */
  stats: () => api.getStats(),

  /** @deprecated Use getInfo instead */
  info: () => api.getInfo(),

  /** @deprecated Use getIndexStats instead */
  indexesList: () => api.getIndexStats(),

  /** @deprecated Use getIndexStats instead */
  indexesStats: (indexName) => api.getIndexStats(),

  /** @deprecated Use rebuildIndex instead */
  indexesRebuild: (indexName) => api.rebuildIndex(indexName)
};

// =============================================================================
// EXPORTS
// =============================================================================

export { APIError, request, streamSSE, buildQueryString };
export default api;
