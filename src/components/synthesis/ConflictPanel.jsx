import React, { memo, useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card } from '../ui';

/**
 * @typedef {import('../../api/client').ConflictItem} ConflictItem
 * @typedef {import('../../api/client').ConflictReport} ConflictReport
 */

/**
 * @typedef {Object} ConflictPanelProps
 * @property {ConflictReport} report - Full conflict report
 * @property {boolean} [defaultExpanded=false] - Whether panel starts expanded
 */

/**
 * Get icon for conflict severity
 */
function getSeverityIcon(severity) {
  switch (severity) {
    case 'high':
      return <AlertCircle size={16} className="conflict-icon-high" />;
    case 'medium':
      return <AlertTriangle size={16} className="conflict-icon-medium" />;
    default:
      return <Info size={16} className="conflict-icon-low" />;
  }
}

/**
 * Get readable label for conflict type
 */
function getTypeLabel(type) {
  const labels = {
    quantitative: 'Numerical Disagreement',
    contradictory: 'Contradictory Statement',
    approach: 'Different Approach',
    temporal: 'Outdated Information',
  };
  return labels[type] || type;
}

/**
 * Single conflict item display
 */
function ConflictItem({ conflict }) {
  const [showContext, setShowContext] = useState(false);

  return (
    <div className={`conflict-item conflict-severity-${conflict.severity}`}>
      <div className="conflict-item-header">
        {getSeverityIcon(conflict.severity)}
        <span className="conflict-type">{getTypeLabel(conflict.type)}</span>
        <span className="conflict-severity-badge">{conflict.severity}</span>
      </div>

      <p className="conflict-description">{conflict.description}</p>

      <div className="conflict-sources">
        <span className="conflict-source">
          <strong>Source A:</strong> {conflict.source_a}
        </span>
        <span className="conflict-vs">vs</span>
        <span className="conflict-source">
          <strong>Source B:</strong> {conflict.source_b}
        </span>
      </div>

      {conflict.section && (
        <p className="conflict-section">
          <strong>Section:</strong> {conflict.section}
        </p>
      )}

      {(conflict.context_a || conflict.context_b) && (
        <>
          <button
            type="button"
            className="conflict-context-toggle"
            onClick={() => setShowContext(!showContext)}
            aria-expanded={showContext}
          >
            {showContext ? 'Hide context' : 'Show context'}
            {showContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showContext && (
            <div className="conflict-context">
              {conflict.context_a && (
                <blockquote className="conflict-context-quote">
                  <cite>From {conflict.source_a}:</cite>
                  <p>"{conflict.context_a}"</p>
                </blockquote>
              )}
              {conflict.context_b && (
                <blockquote className="conflict-context-quote">
                  <cite>From {conflict.source_b}:</cite>
                  <p>"{conflict.context_b}"</p>
                </blockquote>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Expandable panel showing all detected conflicts
 *
 * @param {ConflictPanelProps} props
 */
function ConflictPanel({ report, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!report || report.count === 0) {
    return null;
  }

  return (
    <Card className="conflict-panel">
      <button
        type="button"
        className="conflict-panel-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="conflict-panel-content"
      >
        <div className="conflict-panel-title">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>
            {report.count} Conflict{report.count !== 1 ? 's' : ''} Detected
          </span>
          <span className="conflict-mode-badge">{report.mode} detection</span>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div id="conflict-panel-content" className="conflict-panel-content">
          {/* Summary by type */}
          <div className="conflict-summary">
            <h4>Summary</h4>
            <div className="conflict-summary-grid">
              <div className="conflict-summary-section">
                <span className="conflict-summary-label">By Type:</span>
                <ul className="conflict-summary-list">
                  {Object.entries(report.by_type || {}).map(([type, count]) =>
                    count > 0 ? (
                      <li key={type}>
                        {getTypeLabel(type)}: <strong>{count}</strong>
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
              <div className="conflict-summary-section">
                <span className="conflict-summary-label">By Severity:</span>
                <ul className="conflict-summary-list">
                  {['high', 'medium', 'low'].map((sev) =>
                    (report.by_severity?.[sev] || 0) > 0 ? (
                      <li key={sev} className={`severity-${sev}`}>
                        {sev}: <strong>{report.by_severity[sev]}</strong>
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            </div>
            <p className="conflict-sections-analyzed">
              {report.sections_analyzed} section{report.sections_analyzed !== 1 ? 's' : ''} analyzed
            </p>
          </div>

          {/* Individual conflicts */}
          <div className="conflict-list">
            <h4>Details</h4>
            {(report.conflicts || []).map((conflict, index) => (
              <ConflictItem key={index} conflict={conflict} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default memo(ConflictPanel);
