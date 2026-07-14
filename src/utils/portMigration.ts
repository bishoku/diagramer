import { LogicalDiagram, VisualDiagram } from '../types';

/**
 * Migrate legacy port format to new visual layer.
 * 
 * v0 → v1: fromPort/toPort were on LogicalEdge. Now they live in VisualDiagram.layoutEdges.
 * Also migrates legacy port format ('right') to new format ('right:50').
 * 
 * Called during workspace loading to ensure backward compatibility.
 */
export function migratePortFormat(
  logicalData: LogicalDiagram,
  visualData: VisualDiagram
): { logicalData: LogicalDiagram; visualData: VisualDiagram } {
  // If layoutEdges is already populated, nothing to migrate
  if (Object.keys(visualData.layoutEdges ?? {}).length > 0) {
    return { logicalData, visualData };
  }

  // Legacy data: edges may have had fromPort/toPort on them — read using type assertion
  type LegacyEdge = { id: string; fromPort?: string; toPort?: string; [key: string]: unknown };
  const legacyEdges = logicalData.edges as unknown as LegacyEdge[];

  const hasLegacyPorts = legacyEdges.some(e => e.fromPort !== undefined || e.toPort !== undefined);
  if (!hasLegacyPorts) return { logicalData, visualData };

  const layoutEdges: VisualDiagram['layoutEdges'] = { ...visualData.layoutEdges };
  legacyEdges.forEach(e => {
    const rawFrom = e.fromPort ?? 'right:50';
    const rawTo = e.toPort ?? 'left:50';
    const sourceHandle = rawFrom.includes(':') ? rawFrom : `${rawFrom}:50`;
    const targetHandle = rawTo.includes(':') ? rawTo : `${rawTo}:50`;
    layoutEdges[e.id] = {
      ...(layoutEdges[e.id] ?? { id: e.id }),
      sourceHandle,
      targetHandle,
    };
  });

  return {
    logicalData,
    visualData: { ...visualData, layoutEdges },
  };
}
