import { LogicalDiagram } from '../types';

/**
 * Migrate legacy port format ('right') to new format ('right:50').
 * Called during workspace loading to ensure backward compatibility.
 */
export function migratePortFormat(logicalData: LogicalDiagram): LogicalDiagram {
  const needsMigration = logicalData.edges.some(
    e => !e.fromPort.includes(':') || !e.toPort.includes(':')
  );

  if (!needsMigration) return logicalData;

  return {
    ...logicalData,
    edges: logicalData.edges.map(e => ({
      ...e,
      fromPort: e.fromPort.includes(':') ? e.fromPort : `${e.fromPort}:50`,
      toPort: e.toPort.includes(':') ? e.toPort : `${e.toPort}:50`,
    })),
  };
}
