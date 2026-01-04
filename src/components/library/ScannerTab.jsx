import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderSearch,
  RefreshCw,
  FileText,
  Book,
  GraduationCap,
  Star,
  Filter,
  ChevronDown,
  ChevronUp,
  Check,
  Upload,
  AlertCircle,
  Loader2,
  Search,
  BookOpen,
  Stethoscope
} from 'lucide-react';
import api from '../../api/client';

// Specialty colors
const SPECIALTY_COLORS = {
  vascular: '#ef4444',
  tumor: '#8b5cf6',
  skull_base: '#f59e0b',
  spine: '#10b981',
  functional: '#3b82f6',
  pediatric: '#ec4899',
  trauma: '#6b7280',
  peripheral_nerve: '#14b8a6',
  neuroradiology: '#f97316',
  neuroanatomy: '#6366f1',
  general: '#64748b'
};

// Document type icons
const DOC_TYPE_ICONS = {
  textbook: Book,
  atlas: BookOpen,
  handbook: FileText,
  course_material: GraduationCap,
  exam_questions: FileText,
  guidelines: FileText,
  chapter: FileText
};

/**
 * Authority score stars (1-5)
 */
function AuthorityStars({ score }) {
  const stars = Math.round((score || 0.5) * 5);
  return (
    <div className="authority-stars" title={`Authority: ${(score * 100).toFixed(0)}%`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={12}
          fill={i <= stars ? '#f59e0b' : 'none'}
          stroke={i <= stars ? '#f59e0b' : '#6b7280'}
        />
      ))}
    </div>
  );
}

/**
 * Single document card in the scanner results
 */
function ScannerDocumentCard({ doc, selected, onSelect, onViewChapters }) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = DOC_TYPE_ICONS[doc.document_type] || FileText;

  return (
    <div className={`scanner-doc-card ${selected ? 'selected' : ''}`}>
      <div className="scanner-doc-header">
        <label className="scanner-checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(doc.id)}
          />
          <Check size={14} />
        </label>

        <TypeIcon size={18} className="doc-type-icon" />

        <div className="scanner-doc-title">
          <h4>{doc.title || doc.filename}</h4>
          {doc.authors && <span className="doc-authors">{doc.authors}</span>}
        </div>

        <div className="scanner-doc-meta">
          <span className="doc-pages">{doc.page_count} pages</span>
          {doc.chapter_count > 0 && (
            <span className="doc-chapters">{doc.chapter_count} chapters</span>
          )}
          <AuthorityStars score={doc.authority_score} />
        </div>

        <button
          className="expand-btn"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Specialty & Type badges */}
      <div className="scanner-doc-badges">
        {doc.specialties?.map(spec => (
          <span
            key={spec}
            className="specialty-badge"
            style={{ backgroundColor: SPECIALTY_COLORS[spec] || '#64748b' }}
          >
            {spec.replace(/_/g, ' ')}
          </span>
        ))}
        <span className="type-badge">
          {(doc.document_type || 'unknown').replace(/_/g, ' ')}
        </span>
        {doc.is_ingested && (
          <span className="ingested-badge">Already Ingested</span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="scanner-doc-details">
          <div className="detail-row">
            <span className="detail-label">File:</span>
            <span className="detail-value">{doc.filename}</span>
          </div>
          {doc.year && (
            <div className="detail-row">
              <span className="detail-label">Year:</span>
              <span className="detail-value">{doc.year}</span>
            </div>
          )}
          {doc.publisher && (
            <div className="detail-row">
              <span className="detail-label">Publisher:</span>
              <span className="detail-value">{doc.publisher}</span>
            </div>
          )}
          {doc.estimated_images > 0 && (
            <div className="detail-row">
              <span className="detail-label">Est. Images:</span>
              <span className="detail-value">{doc.estimated_images}</span>
            </div>
          )}
          {doc.chapter_count > 0 && (
            <button
              className="view-chapters-btn"
              onClick={() => onViewChapters(doc)}
            >
              View {doc.chapter_count} Chapters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Chapter selection modal
 */
function ChapterModal({ doc, onClose, onSelectChapters }) {
  const [chapters, setChapters] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChapters = async () => {
      try {
        const data = await api.getLibraryDocument(doc.id);
        setChapters(data.chapters || []);
      } catch (err) {
        console.error('Failed to load chapters:', err);
      } finally {
        setLoading(false);
      }
    };
    loadChapters();
  }, [doc.id]);

  const toggleChapter = (chapterId) => {
    const newSelected = new Set(selectedChapters);
    if (newSelected.has(chapterId)) {
      newSelected.delete(chapterId);
    } else {
      newSelected.add(chapterId);
    }
    setSelectedChapters(newSelected);
  };

  const selectAll = () => {
    setSelectedChapters(new Set(chapters.map(c => c.id)));
  };

  const selectNone = () => {
    setSelectedChapters(new Set());
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="chapter-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Chapters in: {doc.title}</h3>
          <button onClick={onClose}>&times;</button>
        </header>

        <div className="modal-actions">
          <button onClick={selectAll}>Select All</button>
          <button onClick={selectNone}>Select None</button>
        </div>

        <div className="chapter-list">
          {loading ? (
            <div className="loading-spinner"><Loader2 className="spin" /> Loading chapters...</div>
          ) : chapters.length === 0 ? (
            <p className="no-chapters">No chapters detected in this document.</p>
          ) : (
            chapters.map(ch => (
              <label key={ch.id} className="chapter-item">
                <input
                  type="checkbox"
                  checked={selectedChapters.has(ch.id)}
                  onChange={() => toggleChapter(ch.id)}
                />
                <div className="chapter-info">
                  <span className="chapter-title">{ch.title}</span>
                  <span className="chapter-pages">Pages {ch.start_page}-{ch.end_page}</span>
                  {ch.specialty && (
                    <span
                      className="chapter-specialty"
                      style={{ backgroundColor: SPECIALTY_COLORS[ch.specialty] }}
                    >
                      {ch.specialty}
                    </span>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <footer className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="confirm-btn"
            onClick={() => {
              onSelectChapters(doc.id, Array.from(selectedChapters));
              onClose();
            }}
            disabled={selectedChapters.size === 0}
          >
            Select {selectedChapters.size} Chapters
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Main Scanner Tab Component
 */
export default function ScannerTab() {
  // Scan state
  const [scanPath, setScanPath] = useState('/Users/ramihatoum/Desktop/reference library');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);

  // Library state
  const [documents, setDocuments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection state
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [chapterSelections, setChapterSelections] = useState({});
  const [chapterModalDoc, setChapterModalDoc] = useState(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showIngested, setShowIngested] = useState(false);

  // Load initial data
  useEffect(() => {
    loadFilters();
    loadStatistics();
    loadDocuments();
  }, []);

  const loadFilters = async () => {
    try {
      const data = await api.getLibraryFilters();
      setFilters(data);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await api.getLibraryStatistics();
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLibraryDocuments({
        query: searchQuery || undefined,
        specialty: specialtyFilter || undefined,
        document_type: typeFilter || undefined,
        is_ingested: showIngested ? undefined : false,
        limit: 100
      });
      setDocuments(data.documents || data || []);
    } catch (err) {
      setError(err.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, specialtyFilter, typeFilter, showIngested]);

  // Reload when filters change
  useEffect(() => {
    const timer = setTimeout(loadDocuments, 300);
    return () => clearTimeout(timer);
  }, [loadDocuments]);

  const startScan = async () => {
    if (!scanPath.trim()) return;

    setScanning(true);
    setScanProgress({ status: 'starting', current: 0, total: 0 });
    setError(null);

    try {
      await api.startLibraryScan(scanPath, true);

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getScanStatus();
          setScanProgress(status);

          if (status.status === 'complete' || status.status === 'error') {
            clearInterval(pollInterval);
            setScanning(false);
            if (status.status === 'complete') {
              loadDocuments();
              loadStatistics();
            }
          }
        } catch (err) {
          clearInterval(pollInterval);
          setScanning(false);
          setError(err.message);
        }
      }, 500);
    } catch (err) {
      setScanning(false);
      setError(err.message);
    }
  };

  const toggleDocSelection = (docId) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
      // Also remove chapter selections
      const newChapters = { ...chapterSelections };
      delete newChapters[docId];
      setChapterSelections(newChapters);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleChapterSelection = (docId, chapterIds) => {
    setChapterSelections(prev => ({
      ...prev,
      [docId]: chapterIds
    }));
    // Ensure doc is selected
    if (!selectedDocs.has(docId)) {
      setSelectedDocs(prev => new Set([...prev, docId]));
    }
  };

  const queueForIngestion = async () => {
    if (selectedDocs.size === 0) return;

    try {
      await api.queueLibraryForIngest(
        Array.from(selectedDocs),
        chapterSelections
      );
      // Clear selections
      setSelectedDocs(new Set());
      setChapterSelections({});
      // Refresh
      loadDocuments();
      loadStatistics();
      alert(`Queued ${selectedDocs.size} documents for ingestion!`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="scanner-tab">
      {/* Header with scan controls */}
      <header className="scanner-header">
        <div className="scanner-title">
          <FolderSearch size={24} />
          <h2>Reference Library Scanner</h2>
        </div>

        <div className="scan-controls">
          <input
            type="text"
            value={scanPath}
            onChange={e => setScanPath(e.target.value)}
            placeholder="Path to PDF library..."
            className="scan-path-input"
          />
          <button
            className="scan-btn"
            onClick={startScan}
            disabled={scanning || !scanPath.trim()}
          >
            {scanning ? (
              <>
                <Loader2 className="spin" size={16} />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Scan Library
              </>
            )}
          </button>
        </div>

        {/* Scan progress */}
        {scanning && scanProgress && (
          <div className="scan-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${scanProgress.percent_complete || 0}%` }}
              />
            </div>
            <span className="progress-text">
              {scanProgress.current || 0} / {scanProgress.total || '?'} files
            </span>
          </div>
        )}
      </header>

      {/* Statistics bar */}
      {statistics && (
        <div className="scanner-stats">
          <div className="stat-item">
            <span className="stat-value">{statistics.total_documents || 0}</span>
            <span className="stat-label">Documents</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.total_pages || 0}</span>
            <span className="stat-label">Pages</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.total_chapters || 0}</span>
            <span className="stat-label">Chapters</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.ingested_count || 0}</span>
            <span className="stat-label">Ingested</span>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="scanner-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, keywords..."
          />
        </div>

        <button
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          Filters
        </button>

        {selectedDocs.size > 0 && (
          <button className="ingest-btn" onClick={queueForIngestion}>
            <Upload size={16} />
            Ingest {selectedDocs.size} Selected
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="scanner-filters">
          <div className="filter-group">
            <label>Specialty</label>
            <select
              value={specialtyFilter}
              onChange={e => setSpecialtyFilter(e.target.value)}
            >
              <option value="">All Specialties</option>
              {filters?.specialties?.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Document Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {filters?.document_types?.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={showIngested}
              onChange={e => setShowIngested(e.target.checked)}
            />
            Show already ingested
          </label>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="scanner-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Document list */}
      <div className="scanner-results">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={32} />
            <p>Loading library...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <FolderSearch size={48} />
            <h3>No documents found</h3>
            <p>
              {statistics?.total_documents > 0
                ? 'Try adjusting your filters'
                : 'Scan a directory to discover your reference library'}
            </p>
          </div>
        ) : (
          documents.map(doc => (
            <ScannerDocumentCard
              key={doc.id}
              doc={doc}
              selected={selectedDocs.has(doc.id)}
              onSelect={toggleDocSelection}
              onViewChapters={setChapterModalDoc}
            />
          ))
        )}
      </div>

      {/* Chapter selection modal */}
      {chapterModalDoc && (
        <ChapterModal
          doc={chapterModalDoc}
          onClose={() => setChapterModalDoc(null)}
          onSelectChapters={handleChapterSelection}
        />
      )}
    </div>
  );
}
