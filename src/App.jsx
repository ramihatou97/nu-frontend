import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import {
  Upload,
  Compass,
  MessageSquare,
  Library,
  BookOpen,
  Download,
  Tags,
  Columns,
  Activity,
  Brain,
  Network,
} from 'lucide-react';
import { Tabs, Spinner, ErrorBoundary } from './components/ui';
import { ToastProvider } from './context/ToastContext';
import { SynthesisProvider } from './context/SynthesisContext';

// Lazy load tabs for code splitting
const IngestTab = lazy(() => import('./components/ingest/IngestTab'));
const AskTab = lazy(() => import('./components/ask/AskTab'));
const BrowseTab = lazy(() => import('./components/browse/BrowseTab'));
const LibraryTab = lazy(() => import('./components/library/LibraryTab'));
const SynthesisTab = lazy(() => import('./components/synthesis/SynthesisTab'));
const ExportTab = lazy(() => import('./components/export/ExportTab'));
const EntitiesTab = lazy(() => import('./components/entities/EntitiesTab'));
const CompareTab = lazy(() => import('./components/compare/CompareTab'));
const HealthTab = lazy(() => import('./components/health/HealthTab'));
const GraphTab = lazy(() => import('./components/graph/GraphTab'));

/**
 * Tab configuration
 */
const TABS = [
  { id: 'ingest', label: 'Ingest', icon: <Upload size={18} /> },
  { id: 'ask', label: 'Ask', icon: <MessageSquare size={18} /> },
  { id: 'browse', label: 'Browse', icon: <Compass size={18} /> },
  { id: 'library', label: 'Library', icon: <Library size={18} /> },
  { id: 'synthesis', label: 'Synthesis', icon: <BookOpen size={18} /> },
  { id: 'export', label: 'Export', icon: <Download size={18} /> },
  { id: 'entities', label: 'Entities', icon: <Tags size={18} /> },
  { id: 'graph', label: 'Graph', icon: <Network size={18} /> },
  { id: 'compare', label: 'Compare', icon: <Columns size={18} /> },
  { id: 'health', label: 'Health', icon: <Activity size={18} /> },
];

/**
 * Loading fallback component
 */
function TabLoading() {
  return (
    <div className="tab-loading" role="status" aria-label="Loading tab content">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Render tab content based on active tab
 * @param {string} activeTab - Active tab ID
 */
function TabContent({ activeTab, onTabChange }) {
  switch (activeTab) {
    case 'ingest':
      return <IngestTab />;
    case 'ask':
      return <AskTab />;
    case 'browse':
      return <BrowseTab onTabChange={onTabChange} />;
    case 'library':
      return <LibraryTab />;
    case 'synthesis':
      return <SynthesisTab />;
    case 'export':
      return <ExportTab />;
    case 'entities':
      return <EntitiesTab />;
    case 'graph':
      return <GraphTab />;
    case 'compare':
      return <CompareTab />;
    case 'health':
      return <HealthTab />;
    default:
      return null;
  }
}

/**
 * Main application component
 */
function App() {
  const [activeTab, setActiveTab] = useState('ingest');

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Memoize tabs to prevent re-renders
  const tabItems = useMemo(() => TABS, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <SynthesisProvider>
          <div className="app">
          <header className="app-header" role="banner">
            <div className="app-logo">
              <Brain size={32} aria-hidden="true" />
              <h1 className="app-title">NeuroSynth</h1>
            </div>
            <p className="app-tagline">Neurosurgical Knowledge Platform</p>
          </header>

          <nav className="app-nav" role="navigation" aria-label="Main navigation">
            <Tabs
              tabs={tabItems}
              activeTab={activeTab}
              onChange={handleTabChange}
            />
          </nav>

          <main className="app-main" role="main" id="main-content">
            <Suspense fallback={<TabLoading />}>
              <div
                role="tabpanel"
                aria-labelledby={`tab-${activeTab}`}
                id={`panel-${activeTab}`}
                className="tab-panel"
              >
                <TabContent activeTab={activeTab} onTabChange={handleTabChange} />
              </div>
            </Suspense>
          </main>

          <footer className="app-footer" role="contentinfo">
            <p>
              NeuroSynth v3.0.0 &mdash; Powered by RAG
            </p>
          </footer>
          </div>
        </SynthesisProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
