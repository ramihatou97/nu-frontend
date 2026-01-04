/**
 * @fileoverview Custom hooks for API interactions with optimizations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api/client';

/**
 * @typedef {Object} AsyncState
 * @property {any} data - Response data
 * @property {boolean} loading - Loading state
 * @property {Error|null} error - Error state
 */

/**
 * Generic async operation hook with caching
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} [options] - Hook options
 * @param {boolean} [options.immediate=false] - Execute immediately
 * @param {any[]} [options.deps=[]] - Dependencies for immediate execution
 * @returns {[AsyncState, Function, Function]}
 */
export function useAsync(asyncFn, options = {}) {
  const { immediate = false, deps = [] } = options;

  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await asyncFn(...args);
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: err });
      }
      throw err;
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [state, execute, reset];
}

/**
 * Hook for document list with pagination
 * @returns {Object} Document list state and actions
 */
export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.documentsList(options);
      setDocuments(Array.isArray(result) ? result : result.documents || []);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (docId) => {
    await api.documentsDelete(docId);
    setDocuments(docs => docs.filter(d => d.id !== docId));
  }, []);

  const bulkDelete = useCallback(async (docIds) => {
    await api.documentsBulkDelete(docIds);
    setDocuments(docs => docs.filter(d => !docIds.includes(d.id)));
  }, []);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    deleteDocument,
    bulkDelete,
    refresh: fetchDocuments,
  };
}

/**
 * Hook for search functionality
 * @returns {Object} Search state and actions
 */
export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const search = useCallback(async (query, options = {}) => {
    if (!query?.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Structure filters properly for the API client
      const { limit, top_k, mode, ...filterOptions } = options;
      const searchParams = {
        query,
        top_k: top_k ?? limit,
        mode: mode || 'hybrid',
        filters: Object.keys(filterOptions).length > 0 ? filterOptions : undefined
      };
      const data = await api.search(searchParams);
      const items = Array.isArray(data) ? data : data.results || [];
      setResults(items);
      return items;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}

/**
 * Hook for RAG Q&A with streaming and optional conversation persistence
 *
 * @returns {Object} RAG state and actions
 * @property {string} answer - Current answer text
 * @property {Array} sources - Source documents
 * @property {Array} citations - Citation references
 * @property {boolean} loading - Loading state
 * @property {Error|null} error - Error state
 * @property {string|null} conversationId - Backend conversation ID (when persisted)
 * @property {number} historyLength - Server-side history count
 * @property {Function} ask - Ask a question
 * @property {Function} loadConversation - Load existing conversation from backend
 * @property {Function} newConversation - Start fresh conversation
 * @property {Function} clearHistory - Clear current conversation
 */
export function useRAG() {
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [historyLength, setHistoryLength] = useState(0);

  /**
   * Ask a question with optional conversation persistence
   *
   * @param {string} question - The question to ask
   * @param {Object} [options] - Options
   * @param {boolean} [options.stream=true] - Use streaming (fast, no conversation persistence)
   * @param {boolean} [options.persistConversation=false] - Use /conversation endpoint for multi-turn
   * @param {Object} [options.filters] - Search filters
   * @returns {Promise<{answer: string, conversationId?: string}>}
   */
  const ask = useCallback(async (question, options = {}) => {
    setLoading(true);
    setError(null);
    setAnswer('');

    try {
      let finalAnswer = '';
      let newConvId = conversationId;

      // Option 1: Persistent conversation mode (slower, but tracked in backend)
      if (options.persistConversation) {
        const result = await api.sendConversation({
          message: question,
          conversation_id: conversationId,
          filters: options.filters
        });

        finalAnswer = result.answer;
        newConvId = result.conversation_id;

        setAnswer(finalAnswer);
        setCitations(result.citations || []);
        setConversationId(newConvId);
        setHistoryLength(result.history_length || 0);

        return { answer: finalAnswer, conversationId: newConvId };
      }

      // Option 2: Streaming mode (fast, client-side history only)
      if (options.stream !== false) {
        await api.askStream(
          { question, ...options },
          {
            onToken: (chunk) => {
              finalAnswer += chunk;
              setAnswer(finalAnswer);
            },
            onCitation: (citation) => {
              setCitations(prev => [...prev, citation]);
            },
            onDone: (data) => {
              // Capture any metadata from done event
              if (data?.citations) {
                setCitations(data.citations);
              }
            }
          }
        );
      } else {
        // Option 3: Non-streaming one-shot (fast, no persistence)
        const result = await api.ask({ question, ...options });
        finalAnswer = result.answer;
        setAnswer(finalAnswer);
        setSources(result.sources || []);
        setCitations(result.citations || result.used_citations || []);
      }

      // Increment local history count for non-persistent modes
      setHistoryLength(prev => prev + 1);

      return { answer: finalAnswer, conversationId };
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  /**
   * Load an existing conversation from the backend
   *
   * @param {string} id - Conversation ID to load
   * @returns {Promise<Object>} The conversation data
   */
  const loadConversation = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const conv = await api.getConversation(id);

      setConversationId(id);
      setHistoryLength(conv.history?.length || conv.history_length || 0);

      // Restore last assistant answer if available
      if (conv.history?.length > 0) {
        const lastAssistant = [...conv.history].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          setAnswer(lastAssistant.content);
        }
      }

      return conv;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Start a new conversation (resets state)
   */
  const newConversation = useCallback(() => {
    setConversationId(null);
    setHistoryLength(0);
    setAnswer('');
    setSources([]);
    setCitations([]);
    setError(null);
  }, []);

  /**
   * Clear the current conversation from backend and reset state
   */
  const clearHistory = useCallback(async () => {
    try {
      if (conversationId) {
        await api.clearConversations({ conversation_ids: [conversationId] });
      }
    } catch (err) {
      // Log but don't throw - still reset local state
      console.warn('Failed to clear conversation on server:', err);
    }

    newConversation();
  }, [conversationId, newConversation]);

  return {
    // State
    answer,
    sources,
    citations,
    loading,
    error,
    conversationId,
    historyLength,

    // Actions
    ask,
    loadConversation,
    newConversation,
    clearHistory,
  };
}

/**
 * Hook for ingestion with progress tracking
 * @returns {Object} Ingestion state and actions
 */
export function useIngestion() {
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const upload = useCallback(async (file, config = {}) => {
    setStatus('uploading');
    setError(null);
    setProgress(null);

    try {
      const result = await api.ingestUpload(file, config);
      setJobId(result.job_id);
      setStatus('processing');
      return result.job_id;
    } catch (err) {
      setStatus('error');
      setError(err);
      throw err;
    }
  }, []);

  const pollStatus = useCallback(async (id) => {
    try {
      const result = await api.ingestStatus(id);
      // Map backend field name to expected field name
      result.message = result.current_operation;
      setProgress(result);

      if (result.status === 'completed') {
        setStatus('completed');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (result.status === 'failed') {
        setStatus('error');
        setError(new Error(result.error || 'Ingestion failed'));
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      return result;
    } catch (err) {
      setStatus('error');
      setError(err);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      throw err;
    }
  }, []);

  const startPolling = useCallback((id) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Poll every 5 seconds (reduced from 1s to decrease server load)
    intervalRef.current = setInterval(() => pollStatus(id), 5000);
    // Also poll immediately on start
    pollStatus(id);
  }, [pollStatus]);

  const cancel = useCallback(async () => {
    if (jobId) {
      await api.ingestCancel(jobId);
      setStatus('cancelled');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [jobId]);

  const reset = useCallback(() => {
    setJobId(null);
    setProgress(null);
    setStatus('idle');
    setError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    jobId,
    progress,
    status,
    error,
    upload,
    pollStatus,
    startPolling,
    cancel,
    reset,
  };
}

/**
 * Hook for synthesis generation with cancel support
 * @returns {Object} Synthesis state and actions including conflict data
 */
export function useSynthesis() {
  const [content, setContent] = useState('');
  const [result, setResult] = useState(null);  // Full synthesis result with conflicts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);  // Progress updates
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cleanup: abort any ongoing stream
      if (abortRef.current) {
        abortRef.current();
      }
    };
  }, []);

  const generate = useCallback((params, options = {}) => {
    setLoading(true);
    setError(null);
    setContent('');
    setResult(null);
    setProgress(null);

    if (options.stream !== false) {
      // Use generateChapterStream with full handlers
      abortRef.current = api.generateChapterStream(params, {
        onToken: (token) => {
          if (mountedRef.current) {
            setContent(prev => prev + token);
          }
        },
        onProgress: (data) => {
          if (mountedRef.current) {
            setProgress(data);
          }
        },
        onData: (event, data) => {
          // Handle stage: "complete" which contains the full result
          if (mountedRef.current && data?.stage === 'complete' && data?.result) {
            setResult(data.result);
          }
        },
        onComplete: () => {
          if (mountedRef.current) {
            setLoading(false);
            abortRef.current = null;
          }
        },
        onError: (err) => {
          if (mountedRef.current) {
            setError(err);
            setLoading(false);
            abortRef.current = null;
          }
        },
        onAbort: () => {
          if (mountedRef.current) {
            setLoading(false);
            abortRef.current = null;
          }
        }
      });
    } else {
      // Non-streaming mode - returns full SynthesisResponse
      api.generateChapter(params)
        .then(res => {
          if (mountedRef.current) {
            // Build markdown content from sections for display
            const markdown = buildMarkdownFromResult(res);
            setContent(markdown);
            setResult(res);  // Full result with conflict_count, conflict_report
            setLoading(false);
          }
        })
        .catch(err => {
          if (mountedRef.current) {
            setError(err);
            setLoading(false);
          }
        });
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    cancel();
    setContent('');
    setResult(null);
    setProgress(null);
    setError(null);
  }, [cancel]);

  return { content, result, loading, error, progress, generate, clear, cancel };
}

/**
 * Build markdown content from synthesis result sections
 * @param {Object} result - SynthesisResponse object
 * @returns {string} Markdown content
 */
function buildMarkdownFromResult(result) {
  if (!result) return '';

  let md = `# ${result.title}\n\n`;

  if (result.abstract) {
    md += `## Abstract\n\n${result.abstract}\n\n`;
  }

  for (const section of (result.sections || [])) {
    const heading = '#'.repeat(section.level + 1);
    md += `${heading} ${section.title}\n\n${section.content}\n\n`;
  }

  return md;
}

/**
 * Hook for entity management
 * @returns {Object} Entity state and actions
 */
export function useEntities() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEntities = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.entitiesList(options);
      const items = Array.isArray(result) ? result : result.entities || [];
      setEntities(items);
      return items;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchEntities = useCallback(async (query, type) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.entitiesSearch(query, type);
      const items = Array.isArray(result) ? result : result.entities || [];
      setEntities(items);
      return items;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { entities, loading, error, fetchEntities, searchEntities };
}

/**
 * Hook for health monitoring
 * @returns {Object} Health state and actions
 */
export function useHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = useCallback(async (detailed = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = detailed ? await api.healthDetailed() : await api.health();
      setHealth(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { health, loading, error, checkHealth };
}
