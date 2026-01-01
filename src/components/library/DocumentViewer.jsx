import React, { memo, useState, useEffect, useCallback } from 'react';
import { X, FileText, Image as ImageIcon, Info, ChevronLeft, ChevronRight, Layers, Tag } from 'lucide-react';
import { api } from '../../api/client';
import { Spinner, Badge, ImagePreviewModal } from '../ui';
import { useToast } from '../../context/ToastContext';

/**
 * Document Viewer Modal
 * Displays document details, chunks, and images in a tabbed interface
 */
function DocumentViewer({ documentId, onClose }) {
  const [activeTab, setActiveTab] = useState('chunks');
  const [docData, setDocData] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState({ doc: true, chunks: true, images: true });
  const [error, setError] = useState(null);
  const [chunksPage, setChunksPage] = useState(1);
  const [imagesPage, setImagesPage] = useState(1);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [expandedChunks, setExpandedChunks] = useState(new Set());
  const [previewImage, setPreviewImage] = useState(null);
  const toast = useToast();

  const CHUNKS_PER_PAGE = 20;
  const IMAGES_PER_PAGE = 12;

  // Fetch document details
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(prev => ({ ...prev, doc: true }));
        const doc = await api.getDocument(documentId);
        setDocData(doc);
      } catch (err) {
        setError('Failed to load document details');
        toast.error('Failed to load document details');
      } finally {
        setLoading(prev => ({ ...prev, doc: false }));
      }
    };
    fetchDocument();
  }, [documentId]);

  // Fetch chunks
  useEffect(() => {
    const fetchChunks = async () => {
      try {
        setLoading(prev => ({ ...prev, chunks: true }));
        const result = await api.getDocumentChunks(documentId, {
          page: chunksPage,
          page_size: CHUNKS_PER_PAGE
        });
        setChunks(result.chunks || []);
        setTotalChunks(result.total || 0);
      } catch (err) {
        toast.error('Failed to load document chunks');
      } finally {
        setLoading(prev => ({ ...prev, chunks: false }));
      }
    };
    fetchChunks();
  }, [documentId, chunksPage]);

  // Fetch images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(prev => ({ ...prev, images: true }));
        const result = await api.getDocumentImages(documentId, {
          page: imagesPage,
          page_size: IMAGES_PER_PAGE
        });
        setImages(result.images || []);
        setTotalImages(result.total || 0);
      } catch (err) {
        toast.error('Failed to load document images');
      } finally {
        setLoading(prev => ({ ...prev, images: false }));
      }
    };
    fetchImages();
  }, [documentId, imagesPage]);

  // Toggle chunk expansion
  const toggleChunk = useCallback((chunkId) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const totalChunksPages = Math.ceil(totalChunks / CHUNKS_PER_PAGE);
  const totalImagesPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

  // Get image URL from file_path
  const getImageSrc = (img) => {
    if (img.file_path) {
      return `/images/${img.file_path}`;
    }
    return `/images/${img.id}`;
  };

  return (
    <div className="doc-viewer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="doc-viewer-modal" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
        {/* Header */}
        <header className="doc-viewer-header">
          <div className="doc-viewer-title-section">
            <h2 id="viewer-title" className="doc-viewer-title">
              {loading.doc ? 'Loading...' : (docData?.title || 'Document')}
            </h2>
            {docData && (
              <div className="doc-viewer-meta">
                <Badge variant="info" size="sm">
                  <Layers size={12} /> {docData.total_chunks || totalChunks} chunks
                </Badge>
                <Badge variant="info" size="sm">
                  <ImageIcon size={12} /> {docData.total_images || totalImages} images
                </Badge>
              </div>
            )}
          </div>
          <button className="doc-viewer-close" onClick={onClose} aria-label="Close viewer">
            <X size={24} />
          </button>
        </header>

        {/* Tabs */}
        <nav className="doc-viewer-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'chunks'}
            className={`doc-viewer-tab ${activeTab === 'chunks' ? 'active' : ''}`}
            onClick={() => setActiveTab('chunks')}
          >
            <FileText size={16} />
            Chunks ({totalChunks})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'images'}
            className={`doc-viewer-tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <ImageIcon size={16} />
            Images ({totalImages})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'info'}
            className={`doc-viewer-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={16} />
            Info
          </button>
        </nav>

        {/* Content */}
        <div className="doc-viewer-content">
          {error && <div className="doc-viewer-error">{error}</div>}

          {/* Chunks Tab */}
          {activeTab === 'chunks' && (
            <div className="doc-viewer-chunks">
              {loading.chunks ? (
                <div className="doc-viewer-loading"><Spinner /> Loading chunks...</div>
              ) : chunks.length === 0 ? (
                <div className="doc-viewer-empty">No chunks found</div>
              ) : (
                <>
                  <div className="chunks-list">
                    {chunks.map((chunk, idx) => (
                      <div key={chunk.id} className="chunk-item">
                        <div className="chunk-header" onClick={() => toggleChunk(chunk.id)}>
                          <div className="chunk-badges">
                            <Badge variant="default" size="sm">
                              #{(chunksPage - 1) * CHUNKS_PER_PAGE + idx + 1}
                            </Badge>
                            {chunk.page_number && (
                              <Badge variant="info" size="sm">Page {chunk.page_number}</Badge>
                            )}
                            {chunk.chunk_type && (
                              <Badge variant="success" size="sm">{chunk.chunk_type}</Badge>
                            )}
                          </div>
                          <span className="chunk-toggle">
                            {expandedChunks.has(chunk.id) ? '−' : '+'}
                          </span>
                        </div>
                        {chunk.summary && (
                          <div className="chunk-summary">{chunk.summary}</div>
                        )}
                        <div className={`chunk-content ${expandedChunks.has(chunk.id) ? 'expanded' : ''}`}>
                          {chunk.content}
                        </div>
                        {chunk.cuis && chunk.cuis.length > 0 && expandedChunks.has(chunk.id) && (
                          <div className="chunk-cuis">
                            <Tag size={12} />
                            {chunk.cuis.map(cui => (
                              <Badge key={cui} variant="warning" size="sm">{cui}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chunks Pagination */}
                  {totalChunksPages > 1 && (
                    <div className="doc-viewer-pagination">
                      <button
                        disabled={chunksPage <= 1}
                        onClick={() => setChunksPage(p => p - 1)}
                        className="pagination-btn"
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <span className="pagination-info">
                        Page {chunksPage} of {totalChunksPages}
                      </span>
                      <button
                        disabled={chunksPage >= totalChunksPages}
                        onClick={() => setChunksPage(p => p + 1)}
                        className="pagination-btn"
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="doc-viewer-images">
              {loading.images ? (
                <div className="doc-viewer-loading"><Spinner /> Loading images...</div>
              ) : images.length === 0 ? (
                <div className="doc-viewer-empty">No images found</div>
              ) : (
                <>
                  <div className="images-grid">
                    {images.map((img) => (
                      <div key={img.id} className="image-card">
                        <div
                          className="image-wrapper clickable"
                          onDoubleClick={() => setPreviewImage(img)}
                          title="Double-click to preview"
                        >
                          <img
                            src={getImageSrc(img)}
                            alt={img.caption || 'Document image'}
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling?.classList.add('show');
                            }}
                          />
                          <div className="image-fallback">Image unavailable</div>
                        </div>
                        <div className="image-info">
                          {img.page_number && (
                            <Badge variant="info" size="sm">Page {img.page_number}</Badge>
                          )}
                          {img.image_type && (
                            <Badge variant="success" size="sm">{img.image_type}</Badge>
                          )}
                        </div>
                        {(img.caption_summary || img.caption) && (
                          <p className="image-caption">
                            {img.caption_summary || img.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Images Pagination */}
                  {totalImagesPages > 1 && (
                    <div className="doc-viewer-pagination">
                      <button
                        disabled={imagesPage <= 1}
                        onClick={() => setImagesPage(p => p - 1)}
                        className="pagination-btn"
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <span className="pagination-info">
                        Page {imagesPage} of {totalImagesPages}
                      </span>
                      <button
                        disabled={imagesPage >= totalImagesPages}
                        onClick={() => setImagesPage(p => p + 1)}
                        className="pagination-btn"
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="doc-viewer-info">
              {loading.doc ? (
                <div className="doc-viewer-loading"><Spinner /> Loading...</div>
              ) : docData ? (
                <div className="info-grid">
                  <div className="info-item">
                    <label>Title</label>
                    <span>{docData.title || 'Untitled'}</span>
                  </div>
                  <div className="info-item">
                    <label>Document ID</label>
                    <span className="info-mono">{docData.id}</span>
                  </div>
                  <div className="info-item">
                    <label>Total Pages</label>
                    <span>{docData.total_pages || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Total Chunks</label>
                    <span>{docData.total_chunks || totalChunks}</span>
                  </div>
                  <div className="info-item">
                    <label>Total Images</label>
                    <span>{docData.total_images || totalImages}</span>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <span>{docData.created_at ? new Date(docData.created_at).toLocaleString() : 'N/A'}</span>
                  </div>
                  {docData.source_path && (
                    <div className="info-item full-width">
                      <label>Source Path</label>
                      <span className="info-mono">{docData.source_path}</span>
                    </div>
                  )}
                  {docData.stats && (
                    <>
                      <div className="info-section">Statistics</div>
                      {docData.stats.chunks && (
                        <>
                          <div className="info-item">
                            <label>Chunks with Embeddings</label>
                            <span>{docData.stats.chunks.with_embedding || 0}</span>
                          </div>
                          <div className="info-item">
                            <label>Chunks with CUIs</label>
                            <span>{docData.stats.chunks.with_cuis || 0}</span>
                          </div>
                        </>
                      )}
                      {docData.stats.images && (
                        <>
                          <div className="info-item">
                            <label>Images with Embeddings</label>
                            <span>{docData.stats.images.with_embedding || 0}</span>
                          </div>
                          <div className="info-item">
                            <label>Images with Captions</label>
                            <span>{docData.stats.images.with_caption || 0}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="doc-viewer-empty">No document information available</div>
              )}
            </div>
          )}
        </div>

        {/* Image Preview Modal */}
        {previewImage && (
          <ImagePreviewModal
            image={previewImage}
            images={images}
            onClose={() => setPreviewImage(null)}
            onNavigate={setPreviewImage}
            getImageSrc={getImageSrc}
          />
        )}
      </div>
    </div>
  );
}

export default memo(DocumentViewer);
