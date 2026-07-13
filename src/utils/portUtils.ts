import { PortSide, HandleConfig } from '../types';

/**
 * Parse a port ID string into side and offset.
 * Supports both legacy ('right') and new ('right:50') formats.
 */
export function parsePortId(portId: string): { side: PortSide; offset: number } {
  const parts = portId.split(':');
  const side = parts[0] as PortSide;
  const offset = parts.length > 1 ? Number(parts[1]) : 50;
  return { side, offset };
}

/**
 * Normalize a port ID to the '{side}:{offset}' format.
 * If already in new format, returns as-is. If legacy, appends ':50'.
 */
export function normalizePortId(portId: string): string {
  return portId.includes(':') ? portId : `${portId}:50`;
}

/**
 * Extract just the side part from a port ID (works with both formats).
 */
export function getPortSide(portId: string): PortSide {
  return portId.split(':')[0] as PortSide;
}

/**
 * Returns the default 4-handle configuration (one centered handle per side).
 */
export function getDefaultHandles(): HandleConfig[] {
  return [
    { id: 'top:50', side: 'top', offset: 50 },
    { id: 'right:50', side: 'right', offset: 50 },
    { id: 'bottom:50', side: 'bottom', offset: 50 },
    { id: 'left:50', side: 'left', offset: 50 },
  ];
}

/**
 * Resolve a node's handles: return custom handles if defined, otherwise defaults.
 */
export function resolveHandles(handles?: HandleConfig[]): HandleConfig[] {
  return handles && handles.length > 0 ? handles : getDefaultHandles();
}

/**
 * Per-side handle limit and total node handle limit.
 */
export const MAX_HANDLES_PER_SIDE = 4;
export const MAX_HANDLES_PER_NODE = 16;

/**
 * Generate a unique handle ID for a new handle on a given side,
 * avoiding conflicts with existing handles.
 */
export function generateHandleId(side: PortSide, existingHandles: HandleConfig[]): string {
  const sideHandles = existingHandles.filter(h => h.side === side);
  const count = sideHandles.length;
  
  // Auto-distribute evenly
  const newOffset = Math.round(100 / (count + 2) * (count + 1));
  const id = `${side}:${newOffset}`;
  
  // Ensure uniqueness
  if (existingHandles.some(h => h.id === id)) {
    return `${side}:${newOffset + 1}`;
  }
  return id;
}

/**
 * Redistribute handles evenly along a side when adding/removing.
 */
export function redistributeHandlesOnSide(handles: HandleConfig[], side: PortSide): HandleConfig[] {
  const sideHandles = handles.filter(h => h.side === side);
  const otherHandles = handles.filter(h => h.side !== side);
  
  if (sideHandles.length === 0) return handles;
  
  const redistributed = sideHandles.map((h, i) => ({
    ...h,
    offset: Math.round(100 / (sideHandles.length + 1) * (i + 1)),
    id: `${side}:${Math.round(100 / (sideHandles.length + 1) * (i + 1))}`,
  }));
  
  return [...otherHandles, ...redistributed];
}

/**
 * Convert a HandleConfig to CSS style for positioning on the node border.
 * ReactFlow Handle positions are relative to the node box.
 */
export function getHandleStyle(side: PortSide, offset: number): React.CSSProperties {
  switch (side) {
    case 'top':
      return { left: `${offset}%`, top: 0, transform: 'translate(-50%, -50%)' };
    case 'bottom':
      return { left: `${offset}%`, bottom: 0, top: 'auto', transform: 'translate(-50%, 50%)' };
    case 'left':
      return { top: `${offset}%`, left: 0, transform: 'translate(-50%, -50%)' };
    case 'right':
      return { top: `${offset}%`, right: 0, left: 'auto', transform: 'translate(50%, -50%)' };
  }
}
