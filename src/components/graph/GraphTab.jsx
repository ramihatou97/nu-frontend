import React, { memo, useState, useCallback, useEffect } from 'react';
import { Network, Search, Info, RefreshCw, ZoomIn } from 'lucide-react';
import GraphVisualization from './GraphVisualization';
import { Input, Button, Spinner, EmptyState, Card, Badge } from '../ui';
import { api } from '../../api/client';

/**
 * Relation type descriptions for tooltips
 */
const RELATION_DESCRIPTIONS = {
  SUPPLIES: 'Arterial blood supply relationship',
  DRAINS_TO: 'Venous drainage pathway',
  BRANCHES_FROM: 'Arterial branching origin',
  INNERVATES: 'Neural innervation',
  PROJECTS_TO: 'Neural projection pathway',
  RECEIVES_FROM: 'Receives neural input from',
  CONTAINS: 'Anatomical containment',
  PART_OF: 'Part-whole relationship',
  ADJACENT_TO: 'Spatial adjacency',
  CONNECTS: 'Structural connection',
  ATTACHES_TO: 'Attachment point',
  TREATS: 'Treatment relationship',
  CAUSES: 'Causal/pathological relationship',
  INDICATES: 'Diagnostic indication',
  COMPLICATES: 'Complication relationship',
  ASSOCIATED_WITH: 'General association',
};

/**
 * Knowledge Graph Browser Tab
 */
function GraphTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [stats, setStats] = useState(null);
  const [hopLimit, setHopLimit] = useState(2);
  const [centerEntity, setCenterEntity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Fetch graph stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await api.getKnowledgeGraphStats();
        setStats(result);
      } catch (err) {
        console.error('Failed to fetch graph stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Load graph for an entity
  const loadGraph = useCallback(async (entityName) => {
    if (!entityName?.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setSelectedEdge(null);

    try {
      const result = await api.getKnowledgeGraphVisualization(entityName, {
        hop_limit: hopLimit,
        max_nodes: 50,
      });

      setGraphData(result);
      setCenterEntity(entityName);
    } catch (err) {
      setError(err.message || 'Failed to load graph');
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  }, [hopLimit]);

  // Fetch entity suggestions (entities with most occurrences)
  const fetchSuggestions = useCallback(async () => {
    try {
      const result = await api.getEntities({ page_size: 20, sort_by: 'occurrence_count', sort_order: 'desc' });
      const entities = Array.isArray(result) ? result : result.entities || [];
      setSuggestions(entities);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  }, []);

  // Handle clicking on a suggestion
  const handleSuggestionClick = useCallback((entityName) => {
    setSearchQuery(entityName);
    setShowSuggestions(false);
    loadGraph(entityName);
  }, [loadGraph]);

  // Handle search submit
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    loadGraph(searchQuery);
  }, [searchQuery, loadGraph]);

  // Handle node click - load that entity's graph
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge click
  const handleEdgeClick = useCallback((edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Expand from selected node
  const handleExpandNode = useCallback(() => {
    if (selectedNode) {
      setSearchQuery(selectedNode.label);
      loadGraph(selectedNode.label);
    }
  }, [selectedNode, loadGraph]);

  return (
    <div className="graph-tab" role="region" aria-label="Knowledge Graph">
      <header className="tab-header">
        <h2 className="tab-title">
          <Network size={24} aria-hidden="true" />
          Knowledge Graph
        </h2>
        <p className="tab-description">
          Explore anatomical and clinical relationships between entities
        </p>
      </header>

      {/* Stats bar - clickable */}
      {stats && (
        <div className="graph-stats-bar">
          <button
            className="stats-badge-btn"
            onClick={fetchSuggestions}
            title="Click to see entity suggestions"
          >
            <Badge variant="info">{stats.total_entities} entities</Badge>
          </button>
          <Badge variant="info">{stats.total_relations} relations</Badge>
          <Badge variant="default">{stats.relation_types || stats.types?.length || 0} relation types</Badge>
        </div>
      )}

      {/* Entity suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="suggestions-dropdown">
          <header className="suggestions-header">
            <h4>Popular Entities</h4>
            <button onClick={() => setShowSuggestions(false)} className="close-btn">×</button>
          </header>
          <ul className="suggestions-list">
            {suggestions.map((entity) => (
              <li key={entity.id || entity.name}>
                <button
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(entity.name)}
                >
                  {entity.name}
                  {entity.relation_count && (
                    <span className="relation-count">({entity.relation_count} relations)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Search form */}
      <form onSubmit={handleSearch} className="graph-search" role="search">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter entity name (e.g., 'middle cerebral artery')"
          leftIcon={<Search size={18} />}
          aria-label="Search for entity"
        />
        <select
          value={hopLimit}
          onChange={(e) => setHopLimit(parseInt(e.target.value))}
          className="hop-limit-select"
          aria-label="Traversal depth"
        >
          <option value={1}>1 hop</option>
          <option value={2}>2 hops</option>
          <option value={3}>3 hops</option>
        </select>
        <Button type="submit" disabled={loading || !searchQuery.trim()}>
          {loading ? <RefreshCw size={18} className="spin" /> : 'Explore'}
        </Button>
      </form>

      {/* Main content */}
      <div className="graph-content">
        {/* Graph visualization */}
        <div className="graph-main">
          {loading ? (
            <div className="graph-loading">
              <Spinner label="Loading graph..." />
            </div>
          ) : error ? (
            <EmptyState
              icon={<Network size={48} />}
              title="Error Loading Graph"
              description={error}
            />
          ) : !graphData ? (
            <EmptyState
              icon={<Network size={48} />}
              title="Enter an Entity"
              description="Search for a medical entity to visualize its relationships"
            />
          ) : (graphData.elements?.nodes?.length || 0) === 0 ? (
            <EmptyState
              icon={<Network size={48} />}
              title="No Relationships Found"
              description={`No relationships found for "${centerEntity}". Try a different entity or ingest more documents.`}
            />
          ) : (
            <GraphVisualization
              data={graphData.elements}
              centerEntity={centerEntity}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
            />
          )}
        </div>

        {/* Detail panel */}
        <div className="graph-detail-panel">
          {selectedNode && (
            <Card className="detail-card">
              <header className="detail-header">
                <h3>{selectedNode.label}</h3>
                <Badge variant="info">Entity</Badge>
              </header>
              <dl className="detail-info">
                {selectedNode.data?.category && (
                  <>
                    <dt>Category</dt>
                    <dd>{selectedNode.data.category}</dd>
                  </>
                )}
                {selectedNode.data?.relation_count !== undefined && (
                  <>
                    <dt>Relations</dt>
                    <dd>{selectedNode.data.relation_count}</dd>
                  </>
                )}
              </dl>
              <div className="detail-actions">
                <Button size="sm" onClick={handleExpandNode}>
                  <ZoomIn size={14} /> Explore This Entity
                </Button>
              </div>
            </Card>
          )}

          {selectedEdge && (
            <Card className="detail-card">
              <header className="detail-header">
                <h3>{selectedEdge.label?.replace(/_/g, ' ')}</h3>
                <Badge variant="default">Relationship</Badge>
              </header>
              <dl className="detail-info">
                <dt>From</dt>
                <dd>{selectedEdge.data?.source_name || selectedEdge.source}</dd>
                <dt>To</dt>
                <dd>{selectedEdge.data?.target_name || selectedEdge.target}</dd>
                {selectedEdge.data?.confidence && (
                  <>
                    <dt>Confidence</dt>
                    <dd>{(selectedEdge.data.confidence * 100).toFixed(0)}%</dd>
                  </>
                )}
                {selectedEdge.data?.context && (
                  <>
                    <dt>Context</dt>
                    <dd className="context-snippet">{selectedEdge.data.context}</dd>
                  </>
                )}
              </dl>
              {RELATION_DESCRIPTIONS[selectedEdge.label] && (
                <p className="relation-description">
                  <Info size={14} /> {RELATION_DESCRIPTIONS[selectedEdge.label]}
                </p>
              )}
            </Card>
          )}

          {!selectedNode && !selectedEdge && graphData?.elements?.nodes?.length > 0 && (
            <Card className="detail-card help-card">
              <header className="detail-header">
                <h3>Graph Navigation</h3>
              </header>
              <ul className="help-list">
                <li>Click a node to see entity details</li>
                <li>Click an edge to see relationship details</li>
                <li>Use mouse wheel to zoom</li>
                <li>Drag to pan the view</li>
                <li>Click "Explore This Entity" to recenter</li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(GraphTab);
