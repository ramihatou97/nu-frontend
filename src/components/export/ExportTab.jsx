import React, { memo, useCallback, useState } from 'react';
import { Download, FileText, Code, FileType, File } from 'lucide-react';
import { api } from '../../api/client';
import { downloadBlob, downloadText } from '../../utils/helpers';
import { Button, Card, Spinner, Alert } from '../ui';

const EXPORT_FORMATS = [
  {
    id: 'pdf',
    label: 'PDF',
    icon: FileText,
    description: 'Publication-quality PDF with medical journal styling',
    extension: 'pdf',
  },
  {
    id: 'html',
    label: 'HTML',
    icon: Code,
    description: 'Web-ready HTML with embedded images',
    extension: 'html',
  },
  {
    id: 'docx',
    label: 'DOCX',
    icon: FileType,
    description: 'Microsoft Word document for editing',
    extension: 'docx',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    icon: File,
    description: 'Plain text Markdown for documentation',
    extension: 'md',
  },
];

/**
 * Export tab component
 */
function ExportTab() {
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Mock content for demo - in real app, this would come from synthesis
  const [content] = useState({
    title: 'Generated Synthesis',
    sections: [
      {
        heading: 'Introduction',
        content: 'Sample content for export demonstration.',
      },
    ],
  });

  const handleExport = useCallback(async (format) => {
    setExporting(format.id);
    setError(null);
    setSuccess(null);

    try {
      const filename = `neurosynth-export-${Date.now()}.${format.extension}`;

      switch (format.id) {
        case 'pdf': {
          const blob = await api.exportPDF(content);
          downloadBlob(blob, filename);
          break;
        }
        case 'html': {
          const html = await api.exportHTML(content);
          downloadText(html, filename, 'text/html');
          break;
        }
        case 'docx': {
          const blob = await api.exportDOCX(content);
          downloadBlob(blob, filename);
          break;
        }
        case 'markdown': {
          const md = await api.exportMarkdown(content);
          downloadText(md, filename, 'text/markdown');
          break;
        }
      }

      setSuccess(`Exported as ${format.label} successfully`);
    } catch (err) {
      setError(err.message || `Failed to export as ${format.label}`);
    } finally {
      setExporting(null);
    }
  }, [content]);

  return (
    <div className="export-tab" role="region" aria-label="Export options">
      <header className="tab-header">
        <h2 className="tab-title">
          <Download size={24} aria-hidden="true" />
          Export
        </h2>
        <p className="tab-description">
          Export your synthesis to various formats
        </p>
      </header>

      {error && (
        <Alert variant="error" title="Export Failed" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Export Complete" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="export-formats" role="list" aria-label="Available export formats">
        {EXPORT_FORMATS.map((format) => {
          const Icon = format.icon;
          const isExporting = exporting === format.id;

          return (
            <Card
              key={format.id}
              className="export-format-card"
              role="listitem"
            >
              <div className="export-format-icon" aria-hidden="true">
                <Icon size={32} />
              </div>

              <div className="export-format-info">
                <h3 className="export-format-label">{format.label}</h3>
                <p className="export-format-description">{format.description}</p>
              </div>

              <Button
                variant="primary"
                onClick={() => handleExport(format)}
                disabled={isExporting || exporting !== null}
                aria-label={`Export as ${format.label}`}
              >
                {isExporting ? (
                  <>
                    <Spinner size="sm" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} aria-hidden="true" />
                    Export
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="export-preview-card">
        <h3>Preview</h3>
        <p className="export-preview-note">
          Content from your most recent synthesis will be exported.
          Generate a synthesis first if you haven't already.
        </p>
      </Card>
    </div>
  );
}

export default memo(ExportTab);
