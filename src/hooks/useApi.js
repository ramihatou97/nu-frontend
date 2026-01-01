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
      const data = await api.search({ query, ...options });
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
 * Hook for RAG Q&A with streaming
 * @returns {Object} RAG state and actions
 */
export function useRAG() {
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const ask = useCallback(async (question, options = {}) => {
    setLoading(true);
    setError(null);
    setAnswer('');

    try {
      if (options.stream !== false) {
        await api.ragStream(question, options, (chunk) => {
          setAnswer(prev => prev + chunk);
        });
      } else {
        const result = await api.ragAsk(question, options);
        setAnswer(result.answer);
        setSources(result.sources || []);
      }

      setHistory(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ]);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [answer]);

  const clearHistory = useCallback(async () => {
    await api.ragClear();
    setHistory([]);
    setAnswer('');
    setSources([]);
  }, []);

  return { answer, sources, loading, error, history, ask, clearHistory };
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
 * Hook for synthesis generation
 * @returns {Object} Synthesis state and actions
 */
export function useSynthesis() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async (params, options = {}) => {
    setLoading(true);
    setError(null);
    setContent('');

    try {
      if (options.stream !== false) {
        await api.synthesisStream(params, (chunk) => {
          setContent(prev => prev + chunk);
        });
      } else {
        const result = await api.synthesisGenerate(params);
        setContent(result.content);
      }
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setContent('');
    setError(null);
  }, []);

  return { content, loading, error, generate, clear };
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
