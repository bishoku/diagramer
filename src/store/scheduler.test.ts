import { describe, it, expect } from 'vitest';
import { calculateSchedules } from './scheduler';
import { SequenceStep, TimelineTiming, LogicalEdge, LogicalNode } from '../types';

describe('calculateSchedules', () => {
  it('should return empty schedule for empty sequences', () => {
    const schedules = calculateSchedules([], {}, [], []);
    expect(schedules).toEqual({});
  });

  it('should schedule basic sequential steps correctly', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: false },
      { id: 'seq-2', stepNumber: 2, edgeId: 'edge-2', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 0 },
      'seq-2': { sequenceId: 'seq-2', duration: 1500, delay: 200 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
      { id: 'edge-2', sourceId: 'node-2', targetId: 'node-3', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
      { id: 'node-3', type: 'server', name: 'N3' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-1: start at 0 (no delay), ends at 0 + 1000 = 1000
    expect(schedules['seq-1']).toEqual({ start: 0, end: 1000 });
    // seq-2: starts after seq-1 ends (1000) + delay (200) = 1200, ends at 1200 + 1500 = 2700
    expect(schedules['seq-2']).toEqual({ start: 1200, end: 2700 });
  });

  it('should schedule parallel steps concurrently', () => {
    // Both sequences have stepNumber: 1
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: false },
      { id: 'seq-2', stepNumber: 1, edgeId: 'edge-2', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 100 },
      'seq-2': { sequenceId: 'seq-2', duration: 1200, delay: 300 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
      { id: 'edge-2', sourceId: 'node-1', targetId: 'node-3', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
      { id: 'node-3', type: 'server', name: 'N3' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // Both start from 0 because they are in the same stepNumber group
    expect(schedules['seq-1']).toEqual({ start: 100, end: 1100 });
    expect(schedules['seq-2']).toEqual({ start: 300, end: 1500 });
  });

  it('should schedule async steps and not block subsequent steps', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: true, isRoundTrip: false },
      { id: 'seq-2', stepNumber: 2, edgeId: 'edge-2', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 0 },
      'seq-2': { sequenceId: 'seq-2', duration: 1000, delay: 0 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: true },
      { id: 'edge-2', sourceId: 'node-2', targetId: 'node-3', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
      { id: 'node-3', type: 'server', name: 'N3' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-1 starts at 0, ends at 1000. It is async.
    expect(schedules['seq-1']).toEqual({ start: 0, end: 1000 });
    // seq-2 should start at 0 because the previous step (seq-1) is async and doesn't block
    expect(schedules['seq-2']).toEqual({ start: 0, end: 1000 });
  });

  it('should handle round-trip steps with internal process timing', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: true },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { 
        sequenceId: 'seq-1', 
        duration: 1000, // transit time (500 forward, 500 return)
        delay: 0,
        internalProcess: { text: 'Saving to DB', duration: 800 }
      },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // start: 0
    // forward reach: 0 + 500 = 500
    // internal process: 500 + 800 = 1300
    // return transit: 1300 + 500 = 1800
    expect(schedules['seq-1']).toEqual({ start: 0, end: 1800 });
  });

  it('should handle nested sections correctly', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-entry', stepNumber: 1, edgeId: 'edge-entry', isAsync: false, isRoundTrip: false },
      { id: 'seq-internal', stepNumber: 2, edgeId: 'edge-internal', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-entry': { sequenceId: 'seq-entry', duration: 1000, delay: 0 },
      'seq-internal': { sequenceId: 'seq-internal', duration: 800, delay: 100 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-entry', sourceId: 'node-outside', targetId: 'section-container', isAsync: false },
      { id: 'edge-internal', sourceId: 'node-inside-1', targetId: 'node-inside-2', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-outside', type: 'server', name: 'Outside' },
      { id: 'section-container', type: 'section', name: 'Section' },
      { id: 'node-inside-1', type: 'server', name: 'Inside 1', parentId: 'section-container' },
      { id: 'node-inside-2', type: 'server', name: 'Inside 2', parentId: 'section-container' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-entry: starts at 0, arrival at 1000. It targets the section container itself.
    // The subflow (seq-internal) starts after seq-entry's arrival (1000) + delay (100) = 1100.
    // seq-internal ends at 1100 + 800 = 1900.
    // The total end of the section entry step is extended to cover the full duration of the section's execution.
    expect(schedules['seq-entry']).toEqual({ start: 0, end: 1900 });
    expect(schedules['seq-internal']).toEqual({ start: 1100, end: 1900 });
  });

  it('independent parallel chains should not block each other across step groups', () => {
    // Reproduces the user-reported bug:
    // Client fires step-1 to Section-1 (which has a slow internal subflow)
    // AND step-1 to Gateway-2 (a fast independent chain).
    // Gateway-2 → Server-2 is step-2 and should start as soon as
    // Client → Gateway-2 finishes — NOT after Section-1's subflow.
    const sequences: SequenceStep[] = [
      // Step 1 — parallel
      { id: 'seq-entry-section', stepNumber: 1, edgeId: 'edge-client-section', isAsync: false, isRoundTrip: false },
      { id: 'seq-client-gw2',   stepNumber: 1, edgeId: 'edge-client-gw2',    isAsync: false, isRoundTrip: false },
      // Step 2 — sequenced inside section (nested automatically)
      { id: 'seq-gw1-srv1',     stepNumber: 2, edgeId: 'edge-gw1-srv1',      isAsync: false, isRoundTrip: false },
      // Step 2 — independent chain from Gateway-2
      { id: 'seq-gw2-srv2',     stepNumber: 2, edgeId: 'edge-gw2-srv2',      isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-entry-section': { sequenceId: 'seq-entry-section', duration: 2000, delay: 0 },
      'seq-client-gw2':    { sequenceId: 'seq-client-gw2',    duration: 1000, delay: 0 },
      'seq-gw1-srv1':      { sequenceId: 'seq-gw1-srv1',      duration: 1000, delay: 0 },
      'seq-gw2-srv2':      { sequenceId: 'seq-gw2-srv2',      duration: 1000, delay: 0 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-client-section', sourceId: 'node-client',  targetId: 'section-1',   isAsync: false },
      { id: 'edge-client-gw2',     sourceId: 'node-client',  targetId: 'node-gw2',    isAsync: false },
      { id: 'edge-gw1-srv1',       sourceId: 'node-gw1',     targetId: 'node-srv1',   isAsync: false },
      { id: 'edge-gw2-srv2',       sourceId: 'node-gw2',     targetId: 'node-srv2',   isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-client', type: 'client',  name: 'Client' },
      { id: 'section-1',   type: 'section', name: 'Section 1' },
      { id: 'node-gw1',    type: 'gateway', name: 'Gateway 1', parentId: 'section-1' },
      { id: 'node-srv1',   type: 'server',  name: 'Server 1',  parentId: 'section-1' },
      { id: 'node-gw2',    type: 'gateway', name: 'Gateway 2' },
      { id: 'node-srv2',   type: 'server',  name: 'Server 2' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // Step 1 both start at t=0 (parallel)
    expect(schedules['seq-entry-section'].start).toBe(0);
    expect(schedules['seq-client-gw2'].start).toBe(0);
    expect(schedules['seq-client-gw2'].end).toBe(1000);

    // seq-gw1-srv1 is nested under seq-entry-section (Gateway1 parentId=section-1)
    // It starts at arrival of seq-entry-section (t=2000) and ends at t=3000
    expect(schedules['seq-gw1-srv1'].start).toBe(2000);
    expect(schedules['seq-gw1-srv1'].end).toBe(3000);

    // seq-gw2-srv2 sources from node-gw2, which was targeted by seq-client-gw2.
    // It should start as soon as seq-client-gw2 finishes (t=1000),
    // NOT at t=2000 (when Section-1's subflow finishes).
    expect(schedules['seq-gw2-srv2'].start).toBe(1000);
    expect(schedules['seq-gw2-srv2'].end).toBe(2000);
  });
});
