/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing.
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
      eventId: Date.now().toString(36)
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            {/* Icon */}
            <div style={styles.icon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Title */}
            <h1 style={styles.title}>Something went wrong</h1>

            {/* Message */}
            <p style={styles.message}>
              {this.props.message ||
               "We're sorry, but something unexpected happened. Please try again."}
            </p>

            {/* Error ID for support */}
            {this.state.eventId && (
              <p style={styles.eventId}>
                Error ID: <code style={styles.code}>{this.state.eventId}</code>
              </p>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button
                onClick={this.handleRetry}
                style={styles.primaryButton}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={styles.secondaryButton}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={styles.secondaryButton}
              >
                Go Home
              </button>
            </div>

            {/* Error details (dev only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  icon: {
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '12px'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '8px',
    lineHeight: '1.5'
  },
  eventId: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '24px'
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  details: {
    marginTop: '24px',
    textAlign: 'left'
  },
  summary: {
    cursor: 'pointer',
    color: '#666',
    fontSize: '14px'
  },
  errorStack: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#991b1b',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  }
};

export default ErrorBoundary;
