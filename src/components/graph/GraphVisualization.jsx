import React, { useEffect, useRef, memo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';

// Register cola layout
cytoscape.use(cola);

/**
 * Color palette for relation types
 */
const RELATION_COLORS = {
  SUPPLIES: '#e74c3c',      // Red - blood supply
  DRAINS_TO: '#3498db',     // Blue - venous drainage
  BRANCHES_FROM: '#e67e22', // Orange - arterial branches
  INNERVATES: '#9b59b6',    // Purple - neural
  PROJECTS_TO: '#8e44ad',   // Dark purple - neural projections
  RECEIVES_FROM: '#a569bd', // Light purple - neural input
  CONTAINS: '#27ae60',      // Green - anatomical containment
  PART_OF: '#2ecc71',       // Light green - part-whole
  ADJACENT_TO: '#f39c12',   // Yellow - spatial
  CONNECTS: '#1abc9c',      // Teal - connections
  ATTACHES_TO: '#16a085',   // Dark teal - attachments
  TREATS: '#3498db',        // Blue - clinical
  CAUSES: '#c0392b',        // Dark red - pathological
  INDICATES: '#2980b9',     // Mid blue - diagnostic
  COMPLICATES: '#d35400',   // Burnt orange - complications
  ASSOCIATED_WITH: '#7f8c8d', // Gray - generic
};

/**
 * Cytoscape.js styles
 */
const GRAPH_STYLES = [
  {
    selector: 'node',
    style: {
      'background-color': '#4a90d9',
      'label': 'data(label)',
      'color': '#ffffff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      'font-weight': 'normal',
      'text-wrap': 'wrap',
      'text-max-width': 80,
      'width': 60,
      'height': 60,
      'padding': 12,
      'shape': 'ellipse',
      'text-outline-color': '#4a90d9',
      'text-outline-width': 2,
    }
  },
  {
    selector: 'node[?isCenter]',
    style: {
      'background-color': '#2c5aa0',
      'border-width': 3,
      'border-color': '#1a365d',
      'font-size': 13,
      'font-weight': 'bold',
      'width': 80,
      'height': 80,
    }
  },
  {
    selector: 'node:selected',
    style: {
      'background-color': '#1a365d',
      'border-width': 3,
      'border-color': '#f39c12',
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#95a5a6',
      'target-arrow-color': '#95a5a6',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': 9,
      'color': '#7f8c8d',
      'text-rotation': 'autorotate',
      'text-margin-y': -8,
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.9,
      'text-background-padding': 2,
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'width': 3,
      'line-color': '#f39c12',
      'target-arrow-color': '#f39c12',
    }
  },
];

/**
 * Knowledge Graph Visualization using Cytoscape.js
 *
 * @param {Object} props
 * @param {Object} props.data - Graph data in Cytoscape format { nodes: [], edges: [] }
 * @param {Function} props.onNodeClick - Callback when node is clicked
 * @param {Function} props.onEdgeClick - Callback when edge is clicked
 * @param {string} props.centerEntity - Entity to center the graph on
 * @param {string} props.className - Additional CSS class
 */
function GraphVisualization({
  data,
  onNodeClick,
  onEdgeClick,
  centerEntity,
  className = '',
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  // Apply relation-specific edge colors
  const getEdgeStyles = useCallback(() => {
    return Object.entries(RELATION_COLORS).map(([relType, color]) => ({
      selector: `edge[relationType="${relType}"]`,
      style: {
        'line-color': color,
        'target-arrow-color': color,
      }
    }));
  }, []);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [...GRAPH_STYLES, ...getEdgeStyles()],
      layout: { name: 'preset' },
      minZoom: 0.3,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      onNodeClick?.({
        id: node.id(),
        label: node.data('label'),
        data: node.data(),
      });
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      onEdgeClick?.({
        id: edge.id(),
        source: edge.source().id(),
        target: edge.target().id(),
        label: edge.data('label'),
        data: edge.data(),
      });
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [getEdgeStyles, onNodeClick, onEdgeClick]);

  // Update graph data
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;

    // Clear existing elements
    cy.elements().remove();

    // Add new elements
    if (data.nodes?.length > 0) {
      // Mark center entity
      const elements = {
        nodes: data.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            isCenter: node.data.id === centerEntity || node.data.label === centerEntity,
          }
        })),
        edges: data.edges || [],
      };

      cy.add(elements);

      // Run cola layout for force-directed graph
      cy.layout({
        name: 'cola',
        animate: true,
        randomize: false,
        avoidOverlap: true,
        handleDisconnected: true,
        convergenceThreshold: 0.01,
        nodeSpacing: 40,
        edgeLength: 120,
        maxSimulationTime: 2000,
      }).run();

      // Fit to viewport after layout
      setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.fit(undefined, 50);
        }
      }, 500);
    }
  }, [data, centerEntity]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() / 1.2);
  }, []);

  const handleFit = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.fit(undefined, 50);
  }, []);

  const handleCenter = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.center();
  }, []);

  return (
    <div className={`graph-visualization ${className}`}>
      <div className="graph-controls">
        <button onClick={handleZoomIn} title="Zoom In" aria-label="Zoom in">+</button>
        <button onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom out">-</button>
        <button onClick={handleFit} title="Fit to View" aria-label="Fit graph to view">Fit</button>
        <button onClick={handleCenter} title="Center" aria-label="Center graph">Center</button>
      </div>
      <div
        ref={containerRef}
        className="graph-container"
        role="img"
        aria-label="Knowledge graph visualization"
      />
      <div className="graph-legend">
        <span className="legend-title">Relations:</span>
        {Object.entries(RELATION_COLORS).slice(0, 6).map(([type, color]) => (
          <span key={type} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: color }} />
            <span className="legend-label">{type.replace(/_/g, ' ')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(GraphVisualization);
