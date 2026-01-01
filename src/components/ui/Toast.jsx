/**
 * Toast Component - Renders toast notifications
 */

import React, { useEffect, useState } from 'react';

// Toast types matching ToastContext
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={containerStyles}>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { type, message, title, icon, action, dismissible } = toast;
  const [isExiting, setIsExiting] = useState(false);

  const typeConfig = {
    [TOAST_TYPES.SUCCESS]: {
      bg: '#ecfdf5',
      border: '#10b981',
      iconColor: '#10b981',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      )
    },
    [TOAST_TYPES.ERROR]: {
      bg: '#fef2f2',
      border: '#ef4444',
      iconColor: '#ef4444',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    },
    [TOAST_TYPES.WARNING]: {
      bg: '#fffbeb',
      border: '#f59e0b',
      iconColor: '#f59e0b',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    [TOAST_TYPES.INFO]: {
      bg: '#eff6ff',
      border: '#3b82f6',
      iconColor: '#3b82f6',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    },
    [TOAST_TYPES.LOADING]: {
      bg: '#f3f4f6',
      border: '#6b7280',
      iconColor: '#6b7280',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      )
    }
  };

  const config = typeConfig[type] || typeConfig[TOAST_TYPES.INFO];

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      style={{
        ...toastStyles,
        backgroundColor: config.bg,
        borderLeft: `4px solid ${config.border}`,
        animation: isExiting ? 'slideOut 0.2s ease-in forwards' : 'slideIn 0.3s ease-out'
      }}
      role="alert"
    >
      {/* Icon */}
      <div style={{ ...iconStyles, color: config.iconColor }}>
        {icon || config.icon}
      </div>

      {/* Content */}
      <div style={contentStyles}>
        {title && <div style={titleStyles}>{title}</div>}
        <div style={messageStyles}>{message}</div>

        {/* Action button */}
        {action && (
          <button
            onClick={action.onClick}
            style={actionStyles}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && type !== TOAST_TYPES.LOADING && (
        <button
          onClick={handleDismiss}
          style={dismissStyles}
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Styles
const containerStyles = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxWidth: '400px',
  width: '100%',
  pointerEvents: 'none'
};

const toastStyles = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '12px 16px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  pointerEvents: 'auto'
};

const iconStyles = {
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const contentStyles = {
  flex: 1,
  minWidth: 0
};

const titleStyles = {
  fontWeight: '600',
  fontSize: '14px',
  color: '#1f2937',
  marginBottom: '2px'
};

const messageStyles = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.4',
  wordBreak: 'break-word'
};

const actionStyles = {
  marginTop: '8px',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: '500',
  color: '#2563eb',
  backgroundColor: 'transparent',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  cursor: 'pointer'
};

const dismissStyles = {
  padding: '4px',
  color: '#9ca3af',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

// Add CSS animations via style tag (only once)
if (typeof document !== 'undefined' && !document.getElementById('toast-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'toast-animations';
  styleSheet.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ToastContainer;
