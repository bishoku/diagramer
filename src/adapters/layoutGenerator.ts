import { LogicalDiagram, VisualDiagram, VisualNode, VisualEdge } from '../types';
import { getLayoutedElements } from '../utils/layout';

const NODE_WIDTH = 224;
const NODE_HEIGHT = 52;
const SECTION_PADDING = 40; // Padding around children inside a section

/**
 * Generates a VisualDiagram with auto-layout coordinates from a LogicalDiagram.
 * This is used to hydrate imported data that lacks coordinate (x,y) information.
 *
 * Section nodes are sized and positioned to enclose their children with padding,
 * rather than being treated as fixed-size leaf nodes.
 */
export const generateLayout = (
  logicalData: LogicalDiagram,
  baseVisualData: Partial<VisualDiagram> = {},
  direction: 'TB' | 'LR' = 'LR'
): VisualDiagram => {
  const { nodes, edges } = logicalData;

  // Separate section nodes from leaf nodes
  const sectionNodes = nodes.filter(n => n.type === 'section');
  const leafNodes = nodes.filter(n => n.type !== 'section');

  // Convert leaf nodes to reactflow-compatible objects for Dagre
  const rfNodes = leafNodes.map(n => ({
    id: n.id,
    position: { x: 0, y: 0 }, // Initial
    data: { name: n.name, type: n.type },
    width: NODE_WIDTH,
    height: NODE_HEIGHT
  }));

  // Convert logical edges to reactflow-compatible objects for Dagre
  // Only include edges between leaf nodes (sections don't have edges)
  const leafNodeIds = new Set(leafNodes.map(n => n.id));
  const rfEdges = edges
    .filter(e => leafNodeIds.has(e.sourceId) && leafNodeIds.has(e.targetId))
    .map(e => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId
    }));

  // Run the layout algorithm on leaf nodes only
  const layoutedNodes = getLayoutedElements(rfNodes, rfEdges, direction);

  // Map back to VisualNode map
  const layoutNodes: Record<string, VisualNode> = {};
  layoutedNodes.forEach(rn => {
    layoutNodes[rn.id] = {
      id: rn.id,
      x: rn.position.x,
      y: rn.position.y,
      width: rn.width,
      height: rn.height,
      zIndex: 1, // Default zIndex
      theme: 'blue' // Default theme
    };
  });

  // ── Compute section node bounds from children ──────────────────────────
  // For each section, find its children (nodes with parentId === section.id),
  // compute the bounding box, and position the section to enclose them.
  sectionNodes.forEach(section => {
    const children = nodes.filter(n => n.parentId === section.id);

    if (children.length === 0) {
      // Section with no children — place it at a default position
      layoutNodes[section.id] = {
        id: section.id,
        x: 0,
        y: 0,
        width: NODE_WIDTH + SECTION_PADDING * 2,
        height: NODE_HEIGHT + SECTION_PADDING * 2,
        zIndex: -1,
        theme: 'blue'
      };
      return;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    children.forEach(child => {
      const cv = layoutNodes[child.id];
      if (!cv) return;
      const cw = cv.width ?? NODE_WIDTH;
      const ch = cv.height ?? NODE_HEIGHT;
      minX = Math.min(minX, cv.x);
      minY = Math.min(minY, cv.y);
      maxX = Math.max(maxX, cv.x + cw);
      maxY = Math.max(maxY, cv.y + ch);
    });

    if (!isFinite(minX)) return;

    // Position the section so it encloses all children with padding
    const sectionX = minX - SECTION_PADDING;
    const sectionY = minY - SECTION_PADDING;
    const sectionWidth = (maxX - minX) + SECTION_PADDING * 2;
    const sectionHeight = (maxY - minY) + SECTION_PADDING * 2;

    layoutNodes[section.id] = {
      id: section.id,
      x: sectionX,
      y: sectionY,
      width: sectionWidth,
      height: sectionHeight,
      zIndex: -1, // Behind children
      theme: 'blue'
    };
  });

  // Map edges to VisualEdge map
  const layoutEdges: Record<string, VisualEdge> = {};
  edges.forEach(e => {
    layoutEdges[e.id] = {
      id: e.id,
      sourceHandle: direction === 'LR' ? 'right:50' : 'bottom:50',
      targetHandle: direction === 'LR' ? 'left:50' : 'top:50',
      showArrow: true,
    };
  });

  return {
    canvas: {
      zoom: 1,
      pan: { x: 0, y: 0 },
      gridVisible: true,
      ...(baseVisualData.canvas || {}),
    },
    layoutNodes,
    layoutEdges,
    timelines: baseVisualData.timelines || {},
  };
};
