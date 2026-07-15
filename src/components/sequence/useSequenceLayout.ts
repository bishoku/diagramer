import { useMemo } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';

import {
  PARTICIPANT_SPACING,
  HEADER_HEIGHT,
  MESSAGE_ROW_HEIGHT,
  TOP_PADDING,
  LIFELINE_START_Y,
  PARTICIPANT_WIDTH,
  FRAGMENT_PADDING_X,
  FRAGMENT_PADDING_Y,
  computeParticipantOrder,
  computeSlots,
  computeFragmentBounds,
} from './sequenceLayoutUtils';

export {
  PARTICIPANT_SPACING,
  HEADER_HEIGHT,
  MESSAGE_ROW_HEIGHT,
  TOP_PADDING,
  LIFELINE_START_Y,
  PARTICIPANT_WIDTH,
  FRAGMENT_PADDING_X,
  FRAGMENT_PADDING_Y,
  computeParticipantOrder,
  computeSlots,
  computeFragmentBounds,
};

import type { LogicalEdge } from '../../types';

// ── Public data types (used by node/edge components) ─────────────────────────
export interface SeqParticipantData {
  name: string;
  nodeType: string;
  lifelineHeight: number;
  participantIndex: number;
  totalSlots: number;
  logicalId: string;
}

export interface SeqMessageData {
  stepNumber: number;
  protocol: string | undefined;
  isAsync: boolean;
  isRoundTrip: boolean;
  isReturn: boolean;       // true = this is the return arrow of a round-trip
  slotIndex: number;       // which row slot this edge occupies
  seqId: string;
  edgeId: string;
  description: string | undefined;
}

// ── Internal types ────────────────────────────────────────────────────────────
interface FragmentData {
  name: string;
  fragmentWidth: number;
  fragmentHeight: number;
}

// (Moved pure logic to sequenceLayoutUtils.ts)

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useSequenceLayout(): { rfNodes: Node[]; rfEdges: Edge[] } {
  const logicalData = useAppStore((s) => s.logicalData);
  const schedules   = useAppStore((s) => s.schedules);

  return useMemo(() => {
    const { nodes, edges, sequences } = logicalData;
    if (!nodes.length || !sequences.length) return { rfNodes: [], rfEdges: [] };

    const participants = nodes.filter((n) => n.type !== 'section');
    const sections     = nodes.filter((n) => n.type === 'section');
    if (!participants.length) return { rfNodes: [], rfEdges: [] };

    // ── Step 1: Participant order ────────────────────────────────────────────
    const participantOrder = computeParticipantOrder(participants, edges);
    const edgeMap = new Map<string, LogicalEdge>(edges.map((e) => [e.id, e]));

    // ── Step 2: Time-ordered slot assignment ─────────────────────────────────
    const { fwdSlotMap, retSlotMap, totalSlots } = computeSlots(sequences, schedules);

    const lifelineHeight = (totalSlots + 1) * MESSAGE_ROW_HEIGHT;

    // ── Step 3: Participant nodes ────────────────────────────────────────────
    const rfNodes: Node[] = participants.map((p) => {
      const colIndex = participantOrder.get(p.id) ?? 0;
      return {
        id: `seq-p-${p.id}`,
        type: 'seqParticipant',
        position: {
          x: colIndex * PARTICIPANT_SPACING,
          y: TOP_PADDING,
        },
        data: {
          name: p.name,
          nodeType: p.type,
          lifelineHeight,
          participantIndex: colIndex,
          totalSlots,
          logicalId: p.id,
        } satisfies SeqParticipantData,
        draggable: false,
        selectable: false,
        connectable: false,
      };
    });

    // ── Step 4: Fragment nodes (sections) ────────────────────────────────────
    const fragmentBounds = computeFragmentBounds(
      sections, participants, participantOrder, edgeMap,
      sequences, fwdSlotMap, retSlotMap
    );

    fragmentBounds.forEach((fb) => {
      const x = fb.minCol * PARTICIPANT_SPACING - FRAGMENT_PADDING_X;
      const y = HEADER_HEIGHT + fb.minSlot * MESSAGE_ROW_HEIGHT - FRAGMENT_PADDING_Y;
      const fragmentWidth =
        (fb.maxCol - fb.minCol) * PARTICIPANT_SPACING + PARTICIPANT_WIDTH + FRAGMENT_PADDING_X * 2;
      const fragmentHeight =
        (fb.maxSlot - fb.minSlot + 1) * MESSAGE_ROW_HEIGHT + FRAGMENT_PADDING_Y * 2;

      rfNodes.push({
        id: `seq-frag-${fb.sectionNode.id}`,
        type: 'seqFragment',
        position: { x, y },
        data: { name: fb.sectionNode.name, fragmentWidth, fragmentHeight } satisfies FragmentData,
        draggable: false,
        selectable: false,
        connectable: false,
        zIndex: -1,
      });
    });

    // ── Step 5: Message edges ────────────────────────────────────────────────
    const rfEdges: Edge[] = [];

    sequences.forEach((seq) => {
      const edge = edgeMap.get(seq.edgeId);
      if (!edge) return;

      const sourceCol = participantOrder.get(edge.sourceId);
      const targetCol = participantOrder.get(edge.targetId);
      if (sourceCol === undefined || targetCol === undefined) return;

      const fwdSlot = fwdSlotMap.get(seq.id);
      if (fwdSlot === undefined) return;

      const sourceIsLeft = sourceCol < targetCol;

      // Forward edge:
      // If source is to the LEFT of target: source uses right-src, target uses left-tgt
      // If source is to the RIGHT of target: source uses left-src, target uses right-tgt
      rfEdges.push({
        id: `seq-fwd-${seq.id}`,
        type: 'seqMessage',
        source: `seq-p-${edge.sourceId}`,
        target: `seq-p-${edge.targetId}`,
        sourceHandle: `slot-${fwdSlot}-${sourceIsLeft ? 'right-src' : 'left-src'}`,
        targetHandle: `slot-${fwdSlot}-${sourceIsLeft ? 'left-tgt' : 'right-tgt'}`,
        data: {
          stepNumber: seq.stepNumber,
          protocol: edge.protocol,
          isAsync: seq.isAsync,
          isRoundTrip: seq.isRoundTrip ?? false,
          isReturn: false,
          slotIndex: fwdSlot,
          seqId: seq.id,
          edgeId: seq.edgeId,
          description: edge.description,
        } satisfies SeqMessageData,
        selectable: false,
      });

      // Return edge (reversed direction: original target → original source)
      // Original source is LEFT (sourceIsLeft=true): return goes right→left
      //   → return source (right node) uses left-src, return target (left node) uses right-tgt
      // Original source is RIGHT (sourceIsLeft=false): return goes left→right
      //   → return source (left node) uses right-src, return target (right node) uses left-tgt
      if (seq.isRoundTrip) {
        const retSlot = retSlotMap.get(seq.id);
        if (retSlot !== undefined) {
          rfEdges.push({
            id: `seq-ret-${seq.id}`,
            type: 'seqMessage',
            source: `seq-p-${edge.targetId}`,
            target: `seq-p-${edge.sourceId}`,
            sourceHandle: `slot-${retSlot}-${sourceIsLeft ? 'left-src' : 'right-src'}`,
            targetHandle: `slot-${retSlot}-${sourceIsLeft ? 'right-tgt' : 'left-tgt'}`,
            data: {
              stepNumber: seq.stepNumber,
              protocol: edge.protocol,
              isAsync: false,
              isRoundTrip: true,
              isReturn: true,
              slotIndex: retSlot,
              seqId: seq.id,
              edgeId: seq.edgeId,
              description: undefined,
            } satisfies SeqMessageData,
            selectable: false,
          });
        }
      }
    });

    return { rfNodes, rfEdges };
  }, [logicalData, schedules]);
}
