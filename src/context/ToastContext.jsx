/**
 * Toast Context - Provides toast notification functionality across the app
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/ui/Toast';

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

// Default durations (ms)
const DURATIONS = {
  [TOAST_TYPES.SUCCESS]: 3000,
  [TOAST_TYPES.ERROR]: 5000,
  [TOAST_TYPES.WARNING]: 4000,
  [TOAST_TYPES.INFO]: 3000,
  [TOAST_TYPES.LOADING]: null // No auto-dismiss
};

// Create context
const ToastContext = createContext(null);

// Provider component
export function ToastProvider({ children, maxToasts = 5 }) {
  const [toasts, setToasts] = useState([]);

  // Add a toast
  const addToast = useCallback((message, options = {}) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    const toast = {
      id,
      message,
      type: options.type || TOAST_TYPES.INFO,
      duration: options.duration !== undefined
        ? options.duration
        : DURATIONS[options.type || TOAST_TYPES.INFO],
      action: options.action, // { label: string, onClick: () => void }
      dismissible: options.dismissible !== false,
      icon: options.icon,
      title: options.title
    };

    setToasts(prev => {
      // Remove oldest if at max
      const updated = prev.length >= maxToasts
        ? [...prev.slice(1), toast]
        : [...prev, toast];
      return updated;
    });

    // Auto-dismiss
    if (toast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, [maxToasts]);

  // Remove a toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const toast = {
    // Basic toast
    show: (message, options) => addToast(message, options),

    // Success toast
    success: (message, options = {}) =>
      addToast(message, { ...options, type: TOAST_TYPES.SUCCESS }),

    // Error toast
    error: (message, options = {}) =>
      addToast(message, { ...options, type: TOAST_TYPES.ERROR }),

    // Warning toast
    warning: (message, options = {}) =>
      addToast(message, { ...options, type: TOAST_TYPES.WARNING }),

    // Info toast
    info: (message, options = {}) =>
      addToast(message, { ...options, type: TOAST_TYPES.INFO }),

    // Loading toast (returns dismiss function)
    loading: (message, options = {}) => {
      const id = addToast(message, { ...options, type: TOAST_TYPES.LOADING });
      return () => removeToast(id);
    },

    // Promise toast (shows loading, then success/error)
    promise: async (promise, messages) => {
      const id = addToast(messages.loading || 'Loading...', {
        type: TOAST_TYPES.LOADING
      });

      try {
        const result = await promise;
        removeToast(id);
        addToast(messages.success || 'Success!', { type: TOAST_TYPES.SUCCESS });
        return result;
      } catch (error) {
        removeToast(id);
        addToast(
          messages.error || error.message || 'Something went wrong',
          { type: TOAST_TYPES.ERROR }
        );
        throw error;
      }
    },

    // Dismiss specific toast
    dismiss: removeToast,

    // Clear all
    clear: clearToasts
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

export default ToastProvider;
