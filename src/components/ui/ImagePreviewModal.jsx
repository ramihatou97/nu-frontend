import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import Badge from './Badge';

/**
 * Full-screen image preview modal (lightbox)
 * Opens on double-click, supports keyboard navigation
 */
function ImagePreviewModal({
  image,
  images = [],
  onClose,
  onNavigate,
  getImageSrc
}) {
  const [zoom, setZoom] = React.useState(1);

  const currentIndex = images.findIndex(img => img.id === image?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(images[currentIndex - 1]);
    }
  }, [hasPrev, onNavigate, images, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(images[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, images, currentIndex]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
  }, [image?.id]);

  if (!image) return null;

  const imageSrc = getImageSrc ? getImageSrc(image) : `/images/${image.file_path || image.id}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = image.file_name || `image-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="image-preview-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Close button */}
      <button
        className="image-preview-close"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X size={24} />
      </button>

      {/* Navigation - Previous */}
      {hasPrev && (
        <button
          className="image-preview-nav image-preview-prev"
          onClick={handlePrev}
          aria-label="Previous image"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Navigation - Next */}
      {hasNext && (
        <button
          className="image-preview-nav image-preview-next"
          onClick={handleNext}
          aria-label="Next image"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Main image container */}
      <div className="image-preview-container">
        <img
          src={imageSrc}
          alt={image.caption || 'Image preview'}
          className="image-preview-img"
          style={{ transform: `scale(${zoom})` }}
          onDoubleClick={handleResetZoom}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="image-preview-toolbar">
        <div className="image-preview-info">
          {image.page_number && (
            <Badge variant="info" size="sm">Page {image.page_number}</Badge>
          )}
          {image.image_type && (
            <Badge variant="success" size="sm">{image.image_type}</Badge>
          )}
          {images.length > 1 && (
            <span className="image-preview-counter">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="image-preview-controls">
          <button onClick={handleZoomOut} title="Zoom out (-)">
            <ZoomOut size={18} />
          </button>
          <span className="image-preview-zoom">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} title="Zoom in (+)">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleDownload} title="Download">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Caption overlay */}
      {(image.caption || image.caption_summary) && (
        <div className="image-preview-caption">
          {image.caption_summary || image.caption}
        </div>
      )}
    </div>
  );
}

export default ImagePreviewModal;
