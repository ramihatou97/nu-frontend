/**
 * Synthesis Context - Shares synthesis output state across tabs
 *
 * Enables Export tab to access content from Synthesis tab.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const SynthesisContext = createContext(null);

/**
 * Provider component for synthesis output state
 */
export function SynthesisProvider({ children }) {
  const [synthesisOutput, setSynthesisOutput] = useState({
    content: '',
    topic: '',
    generatedAt: null,
  });

  const setOutput = useCallback((content, topic) => {
    setSynthesisOutput({
      content,
      topic,
      generatedAt: content ? new Date().toISOString() : null,
    });
  }, []);

  const clearOutput = useCallback(() => {
    setSynthesisOutput({
      content: '',
      topic: '',
      generatedAt: null,
    });
  }, []);

  const hasContent = Boolean(synthesisOutput.content);

  return (
    <SynthesisContext.Provider value={{
      ...synthesisOutput,
      hasContent,
      setOutput,
      clearOutput
    }}>
      {children}
    </SynthesisContext.Provider>
  );
}

/**
 * Hook to access synthesis output state
 * @returns {{ content: string, topic: string, generatedAt: string|null, hasContent: boolean, setOutput: Function, clearOutput: Function }}
 */
export function useSynthesisOutput() {
  const context = useContext(SynthesisContext);
  if (!context) {
    throw new Error('useSynthesisOutput must be used within a SynthesisProvider');
  }
  return context;
}

export default SynthesisProvider;
