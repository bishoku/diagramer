import dagre from 'dagre';
import type { LogicalNode, LogicalEdge, SequenceStep } from '../../types';

// ── Layout Constants ────────────────────────────────────────────────────────
export const PARTICIPANT_SPACING = 250;
export const HEADER_HEIGHT = 60;
export const MESSAGE_ROW_HEIGHT = 70;
export const TOP_PADDING = 20;
export const LIFELINE_START_Y = HEADER_HEIGHT + TOP_PADDING;
export const PARTICIPANT_WIDTH = 180;
export const FRAGMENT_PADDING_X = 20;
export const FRAGMENT_PADDING_Y = 12;

// ── Dagre participant ordering (LR) ──────────────────────────────────────────
export function computeParticipantOrder(
  participants: LogicalNode[],
  edges: LogicalEdge[]
): Map<string, number> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const participantIds = new Set(participants.map((p) => p.id));
  participants.forEach((p) => g.setNode(p.id, { width: PARTICIPANT_WIDTH, height: HEADER_HEIGHT }));
  edges.forEach((e) => {
    if (participantIds.has(e.sourceId) && participantIds.has(e.targetId)) {
      g.setEdge(e.sourceId, e.targetId);
    }
  });

  dagre.layout(g);

  const ordered = participants
    .map((p) => ({ id: p.id, x: g.node(p.id)?.x ?? 0 }))
    .sort((a, b) => a.x - b.x);

  const orderMap = new Map<string, number>();
  ordered.forEach((item, index) => orderMap.set(item.id, index));
  return orderMap;
}

// ── Time-ordered slot assignment ──────────────────────────────────────────────
export function computeSlots(
  sequences: SequenceStep[],
  schedules: Record<string, { start: number; end: number }>
): {
  fwdSlotMap: Map<string, number>;
  retSlotMap: Map<string, number>;
  totalSlots: number;
} {
  interface SlotEvent {
    seqId: string;
    time: number;
    isReturn: boolean;
  }

  const events: SlotEvent[] = [];
  sequences.forEach((seq) => {
    const sched = schedules[seq.id];
    const startTime = sched?.start ?? 0;
    const endTime = sched?.end ?? startTime + 1;
    events.push({ seqId: seq.id, time: startTime, isReturn: false });
    if (seq.isRoundTrip) {
      events.push({ seqId: seq.id, time: endTime, isReturn: true });
    }
  });

  // Sort by time.
  // Tiebreaker at same timestamp: RETURN before FORWARD.
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.isReturn ? -1 : 1; 
  });

  const fwdSlotMap = new Map<string, number>();
  const retSlotMap = new Map<string, number>();
  events.forEach((event, idx) => {
    if (event.isReturn) retSlotMap.set(event.seqId, idx);
    else fwdSlotMap.set(event.seqId, idx);
  });

  return { fwdSlotMap, retSlotMap, totalSlots: events.length };
}

// ── Fragment bounds for section nodes ────────────────────────────────────────
export interface FragmentBounds {
  sectionNode: LogicalNode;
  minCol: number;
  maxCol: number;
  minSlot: number;
  maxSlot: number;
}

export function computeFragmentBounds(
  sections: LogicalNode[],
  participants: LogicalNode[],
  participantOrder: Map<string, number>,
  edgeMap: Map<string, LogicalEdge>,
  sequences: SequenceStep[],
  fwdSlotMap: Map<string, number>,
  retSlotMap: Map<string, number>
): FragmentBounds[] {
  return sections.flatMap((section) => {
    const children = participants.filter((n) => n.parentId === section.id);
    if (!children.length) return [];

    const childIds = new Set(children.map((c) => c.id));

    let minCol = Infinity, maxCol = -Infinity;
    children.forEach((child) => {
      const col = participantOrder.get(child.id);
      if (col !== undefined) { minCol = Math.min(minCol, col); maxCol = Math.max(maxCol, col); }
    });
    if (!isFinite(minCol)) return [];

    let minSlot = Infinity, maxSlot = -Infinity;
    sequences.forEach((seq) => {
      const edge = edgeMap.get(seq.edgeId);
      if (!edge) return;
      if (childIds.has(edge.sourceId) || childIds.has(edge.targetId)) {
        const fwd = fwdSlotMap.get(seq.id);
        const ret = retSlotMap.get(seq.id);
        if (fwd !== undefined) { minSlot = Math.min(minSlot, fwd); maxSlot = Math.max(maxSlot, fwd); }
        if (ret !== undefined) maxSlot = Math.max(maxSlot, ret);
      }
    });
    if (!isFinite(minSlot)) { minSlot = 0; maxSlot = 0; }

    return [{ sectionNode: section, minCol, maxCol, minSlot, maxSlot }];
  });
}
