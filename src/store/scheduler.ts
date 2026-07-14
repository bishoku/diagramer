import { SequenceStep, TimelineTiming, LogicalEdge, LogicalNode } from '../types';

export const calculateSchedules = (
  sequences: SequenceStep[],
  timelines: Record<string, TimelineTiming>,
  edges: LogicalEdge[] = [],
  nodes: LogicalNode[] = []
): Record<string, { start: number; end: number }> => {
  const sortedSeqs = [...sequences].sort((a, b) => a.stepNumber - b.stepNumber);
  const schedules: Record<string, { start: number; end: number }> = {};

  if (sortedSeqs.length === 0) return schedules;

  const edgeMap = new Map(edges.map(e => [e.id, e]));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Identify section nodes
  const sectionIds = new Set(nodes.filter(n => n.type === 'section').map(n => n.id));

  // Resolve source/target node IDs for each sequence step
  const seqNodes = new Map<string, { src: string; tgt: string }>();
  sortedSeqs.forEach(seq => {
    const edge = edgeMap.get(seq.edgeId);
    const src = edge ? (seq.direction === 'reverse' ? edge.to : edge.from) : '';
    const tgt = edge ? (seq.direction === 'reverse' ? edge.from : edge.to) : '';
    seqNodes.set(seq.id, { src, tgt });
  });

  // Build nesting tree: determine parent for each step
  const childrenOf = new Map<string, SequenceStep[]>();
  const nested = new Set<string>();
  const activeRTTargets = new Map<string, string>(); // nodeId -> round-trip stepId that targets it

  // Phase 1: RT nesting (existing logic)
  sortedSeqs.forEach(seq => {
    const { src } = seqNodes.get(seq.id)!;
    const parentId = src ? activeRTTargets.get(src) : undefined;

    if (parentId) {
      nested.add(seq.id);
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(seq);
    }

    if (seq.isRoundTrip) {
      const { tgt } = seqNodes.get(seq.id)!;
      if (tgt) activeRTTargets.set(tgt, seq.id);
    }
  });

  // Phase 2: Section nesting — edges whose source AND target are children of a section
  // become children of the step that targets that section
  const sectionEntrySteps = new Map<string, string>(); // sectionId -> stepId that targets it
  
  sortedSeqs.forEach(seq => {
    const { tgt } = seqNodes.get(seq.id)!;
    if (tgt && sectionIds.has(tgt)) {
      sectionEntrySteps.set(tgt, seq.id);
    }
  });

  // Find edges that originate from inside a section
  // Any edge whose SOURCE node is a child of a section becomes part of that section's subflow
  sortedSeqs.forEach(seq => {
    if (nested.has(seq.id)) return; // Already nested
    const edge = edgeMap.get(seq.edgeId);
    if (!edge) return;
    
    const fromNode = nodeMap.get(edge.from);
    if (!fromNode) return;
    
    // If the source node is a child of a section that has an entry step
    if (fromNode.parentId && sectionIds.has(fromNode.parentId)) {
      const sectionId = fromNode.parentId;
      const parentStepId = sectionEntrySteps.get(sectionId);
      if (parentStepId && parentStepId !== seq.id) {
        nested.add(seq.id);
        if (!childrenOf.has(parentStepId)) childrenOf.set(parentStepId, []);
        childrenOf.get(parentStepId)!.push(seq);
      }
    }
  });



  // Recursive: process a step and all its nested children, return total end time
  function processStep(seq: SequenceStep, startTime: number): number {
    const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
    const duration = timing.duration ?? 1000;
    const children = childrenOf.get(seq.id) || [];

    // Case 1: Simple step with no children and not round-trip
    if (!seq.isRoundTrip && children.length === 0) {
      schedules[seq.id] = { start: startTime, end: startTime + duration };
      return startTime + duration;
    }

    // Case 2: Section-targeting step (has children from internal edges)
    // The step's animation reaches the section, then internal edges play as subflow
    if (!seq.isRoundTrip && children.length > 0) {
      const arrivalTime = startTime + duration;
      
      // Process internal edges (subflow) starting from arrival time
      const childGroups: Record<number, SequenceStep[]> = {};
      children.forEach(c => {
        if (!childGroups[c.stepNumber]) childGroups[c.stepNumber] = [];
        childGroups[c.stepNumber].push(c);
      });

      let childReadyTime = arrivalTime;
      let latestSyncEnd = arrivalTime;

      Object.keys(childGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
        const group = childGroups[gn];
        const snapshot = childReadyTime;
        group.forEach(child => {
          const childTiming = timelines[child.id] || { sequenceId: child.id, duration: 1000, delay: 0 };
          const childDelay = childTiming.delay ?? 0;
          const childStart = snapshot + childDelay;
          const childEnd = processStep(child, childStart);
          if (!child.isAsync) {
            if (childEnd > childReadyTime) childReadyTime = childEnd;
            if (childEnd > latestSyncEnd) latestSyncEnd = childEnd;
          }
        });
      });

      // If the incoming edge is async, the main flow returns at arrivalTime (not waiting for subflow)
      // But the section's total end includes the subflow completion
      schedules[seq.id] = { start: startTime, end: latestSyncEnd };
      
      // For async edges, the "blocking" end is just the arrival time
      // The scheduler uses isAsync flag at the root level to decide whether to wait
      return seq.isAsync ? arrivalTime : latestSyncEnd;
    }

    // Case 3: Round-trip step (existing logic, may also have children)
    const halfTransit = duration / 2;
    const forwardReach = startTime + halfTransit;
    const ipDur = timing.internalProcess ? (timing.internalProcess.duration ?? 1000) : 0;

    // Process children grouped by stepNumber for concurrent starts
    const childGroups: Record<number, SequenceStep[]> = {};
    children.forEach(c => {
      if (!childGroups[c.stepNumber]) childGroups[c.stepNumber] = [];
      childGroups[c.stepNumber].push(c);
    });

    let childReadyTime = forwardReach;
    let latestSyncEnd = forwardReach;

    Object.keys(childGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
      const group = childGroups[gn];
      const snapshot = childReadyTime; // snapshot for concurrent starts within group

      group.forEach(child => {
        const childTiming = timelines[child.id] || { sequenceId: child.id, duration: 1000, delay: 0 };
        const childDelay = childTiming.delay ?? 0;
        const childStart = snapshot + childDelay;
        const childEnd = processStep(child, childStart);

        if (!child.isAsync) {
          if (childEnd > childReadyTime) childReadyTime = childEnd;
          if (childEnd > latestSyncEnd) latestSyncEnd = childEnd;
        }
      });
    });

    // Return transit starts after all sync children complete + internal process
    const returnStart = latestSyncEnd + ipDur;
    const totalEnd = returnStart + halfTransit;

    schedules[seq.id] = { start: startTime, end: totalEnd };
    return totalEnd;
  }

  // Process root-level steps grouped by stepNumber.
  //
  // SOURCE-CHAIN DEPENDENCY MODEL
  // ─────────────────────────────
  // Instead of a single global cursor that forces every seq in step N to
  // wait for ALL seqs in step N-1, each seq's start is derived from the
  // latest completion time of seqs that targeted its own source node
  // (i.e. its direct predecessor in the data-flow graph).
  //
  // If no prior seq has targeted a seq's source node, the algorithm falls
  // back to the global floor (= max end of all seqs in the previous step
  // group), preserving the traditional "global barrier" behaviour for
  // chains that have no explicit source dependency.
  //
  // Example where this matters:
  //   Step 1:  Client → Section-1 (duration 2000ms, includes subflow)
  //   Step 1:  Client → Gateway-2 (duration 1000ms, independent chain)
  //   Step 2:  Gateway-2 → Server-2
  //
  // Old: Gateway-2 → Server-2 waited until Section-1's subflow finished (t=2000)
  // New: Gateway-2 → Server-2 starts as soon as Client → Gateway-2 finishes (t=1000)

  const rootSteps = sortedSeqs.filter(seq => !nested.has(seq.id));
  const rootGroups: Record<number, SequenceStep[]> = {};
  rootSteps.forEach(seq => {
    if (!rootGroups[seq.stepNumber]) rootGroups[seq.stepNumber] = [];
    rootGroups[seq.stepNumber].push(seq);
  });

  // nodeEndTime[nodeId] = latest end-time of any root-level (non-async) seq
  // that has *targeted* this node. Updated as seqs are processed.
  const nodeEndTime = new Map<string, number>();

  // Global floor: falls back to max-sync-end of the previous step group
  // for seqs that have no direct source-chain predecessor.
  let globalFloor = 0;

  Object.keys(rootGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
    const group = rootGroups[gn];
    let maxSyncEnd = globalFloor;

    group.forEach(seq => {
      const { src, tgt } = seqNodes.get(seq.id)!;
      const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
      const delay = timing.delay ?? 0;

      // Primary: use the end-time of the seq that most recently targeted this
      // seq's source node (source-chain dependency).
      // Fallback: global floor, so seqs with no direct predecessor still
      // respect the step-number ordering barrier.
      const sourceChainEnd = nodeEndTime.get(src); // undefined ⟹ no predecessor
      const baseStart = sourceChainEnd !== undefined ? sourceChainEnd : globalFloor;
      const startTime = baseStart + delay;

      const totalEnd = processStep(seq, startTime);

      // Record when the target node becomes "ready" for subsequent seqs.
      if (!seq.isAsync && tgt) {
        nodeEndTime.set(tgt, Math.max(nodeEndTime.get(tgt) ?? 0, totalEnd));
      }

      if (!seq.isAsync && totalEnd > maxSyncEnd) {
        maxSyncEnd = totalEnd;
      }
    });

    // Advance the global floor to the max sync-end of this step group.
    // Seqs in the next group that have no direct source-chain predecessor
    // will start from here.
    globalFloor = maxSyncEnd;
  });

  return schedules;
};
