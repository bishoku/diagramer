import { DiagramAdapter } from './types';
import { LogicalDiagram, LogicalNode, LogicalEdge, SequenceStep, VisualDiagram, TimelineTiming, StickyNote } from '../types';
import { generateLayout } from './layoutGenerator';

// ── Arrow type definitions ──────────────────────────────────────────────────
interface ArrowInfo {
  isDotted: boolean;    // Dashed line (return/async response)
  hasArrowhead: boolean; // >> or ) at end
  isLost: boolean;      // -x / --x (cross at end)
  isOpenArrow: boolean; // -) / --) (async open arrow)
}

const ARROW_MAP: Record<string, ArrowInfo> = {
  '->>':  { isDotted: false, hasArrowhead: true,  isLost: false, isOpenArrow: false },
  '-->>': { isDotted: true,  hasArrowhead: true,  isLost: false, isOpenArrow: false },
  '->':   { isDotted: false, hasArrowhead: false, isLost: false, isOpenArrow: false },
  '-->':  { isDotted: true,  hasArrowhead: false, isLost: false, isOpenArrow: false },
  '-x':   { isDotted: false, hasArrowhead: false, isLost: true,  isOpenArrow: false },
  '--x':  { isDotted: true,  hasArrowhead: false, isLost: true,  isOpenArrow: false },
  '-)':   { isDotted: false, hasArrowhead: false, isLost: false, isOpenArrow: true },
  '--)':  { isDotted: true,  hasArrowhead: false, isLost: false, isOpenArrow: true },
};



// ── Parser helper types ─────────────────────────────────────────────────────
interface ParsedInteraction {
  from: string;
  to: string;
  message: string;
  arrowRaw: string;
  arrowInfo: ArrowInfo;
  activateTarget: boolean;   // +
  deactivateTarget: boolean; // -
}

interface ParsedNote {
  position: 'left' | 'right' | 'over';
  participants: string[]; // 1 or 2 participant names
  text: string;
  afterInteractionIndex: number; // Index of the last interaction before this note
}

interface FragmentFrame {
  id: string;
  type: string; // alt, loop, opt, par, critical, break, rect
  label: string;
  startInteractionIndex: number;
  participantNames: Set<string>; // Track which participants are involved
}

interface BoxFrame {
  id: string;
  label: string;
  color?: string;
  participantNames: string[];
}

// ── Main adapter ────────────────────────────────────────────────────────────
export const mermaidAdapter: DiagramAdapter = {
  id: 'mermaid-sequence',
  name: 'Mermaid Sequence Diagram',
  description: 'Import Mermaid.js sequence diagrams with full syntax support',
  importMethod: 'text-modal',
  supportedFormats: ['.mmd', '.txt'],

  parse: async (rawInput: string): Promise<{ logicalData: LogicalDiagram; visualData: VisualDiagram }> => {
    const lines = rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // ── State ─────────────────────────────────────────────────────────────
    const participantOrder: string[] = [];             // Ordered participant IDs (first-seen order)
    const participantAliases = new Map<string, string>(); // id → display name
    const participantTypes = new Map<string, string>();   // id → 'participant' | 'actor'
    const interactions: ParsedInteraction[] = [];
    const notes: ParsedNote[] = [];
    const fragmentStack: FragmentFrame[] = [];         // Stack for nested fragments
    const completedFragments: FragmentFrame[] = [];    // Finished fragments with their interaction ranges
    const boxes: BoxFrame[] = [];
    let currentBox: BoxFrame | null = null;
    let fragmentCounter = 0;
    let boxCounter = 0;
    let autonumber = false; // Tracked for potential future use
    void autonumber; // suppress TS6133

    // Helper: ensure participant is registered
    function ensureParticipant(name: string, type: string = 'service') {
      if (!participantOrder.includes(name)) {
        participantOrder.push(name);
        participantTypes.set(name, type);
      }
    }

    // ── Arrow regex ───────────────────────────────────────────────────────
    // Matches: Source ARROW [+|-] Target : Message
    // Arrow types: -->> | ->> | --> | -> | --x | -x | --) | -)
    // The +/- modifier comes AFTER the arrow, BEFORE the target name
    // Examples:
    //   A->>+B: hello     → from=A, arrow=->>, modifier=+, to=B, msg=hello
    //   A-->>-B: goodbye  → from=A, arrow=-->>, modifier=-, to=B, msg=goodbye
    //   A->>B: normal     → from=A, arrow=->>, modifier=none, to=B, msg=normal
    const arrowRegex = /^(.+?)\s*(-->>|--\)|--x|-->|->>|-\)|-x|->)\s*(\+|-)?\s*(.+?)\s*:\s*(.*)$/;

    // ── Line-by-line parsing ──────────────────────────────────────────────
    for (const line of lines) {
      // Skip diagram declaration
      if (line.toLowerCase() === 'sequencediagram' || line.toLowerCase() === 'sequence-diagram') {
        continue;
      }

      // Skip comments
      if (line.startsWith('%%')) {
        continue;
      }

      // Title (metadata only, skip)
      if (line.toLowerCase().startsWith('title ') || line.toLowerCase().startsWith('title:')) {
        continue;
      }

      // Autonumber
      if (line.toLowerCase() === 'autonumber') {
        autonumber = true;
        continue;
      }

      // ── Participant / Actor declaration ───────────────────────────────
      const participantMatch = line.match(/^(participant|actor)\s+(.+)$/i);
      if (participantMatch) {
        const pType = participantMatch[1].toLowerCase();
        let rest = participantMatch[2].trim();

        let id: string;
        let displayName: string;

        if (rest.includes(' as ')) {
          const parts = rest.split(' as ');
          id = parts[0].trim();
          displayName = parts[1].trim();
        } else {
          id = rest;
          displayName = rest;
        }

        ensureParticipant(id, pType === 'actor' ? 'client' : 'service');
        if (displayName !== id) {
          participantAliases.set(id, displayName);
        }

        // If inside a box, add to box
        if (currentBox) {
          currentBox.participantNames.push(id);
        }
        continue;
      }

      // ── Box grouping ──────────────────────────────────────────────────
      const boxMatch = line.match(/^box\s*(.*)?$/i);
      if (boxMatch) {
        const boxContent = (boxMatch[1] || '').trim();
        // Parse optional color and label from box content
        // e.g. "Purple Application Layer", "rgb(200,255,200) Green Group", "transparent Data Layer"
        let color: string | undefined;
        let label = boxContent;

        // Check for color prefix
        const colorPatterns = [
          /^(rgb\([^)]+\)|rgba\([^)]+\))\s*(.*)/i,
          /^(transparent)\s*(.*)/i,
          /^(#[0-9a-fA-F]{3,8})\s*(.*)/,
          /^([a-zA-Z]+)\s+(".*"|.+)/,  // Named color + label
        ];

        for (const pat of colorPatterns) {
          const cm = boxContent.match(pat);
          if (cm) {
            color = cm[1];
            label = cm[2].replace(/^"(.*)"$/, '$1').trim();
            break;
          }
        }

        if (!label) label = 'Group';

        currentBox = {
          id: `box_${boxCounter++}`,
          label,
          color,
          participantNames: [],
        };
        continue;
      }

      // ── activate / deactivate keywords ────────────────────────────────
      const activateMatch = line.match(/^(activate|deactivate)\s+(.+)$/i);
      if (activateMatch) {
        // Track activation state — the visual rendering handles this
        // via the activity box in SeqParticipantNode, so we just need
        // to ensure the participant exists
        const participantName = activateMatch[2].trim();
        ensureParticipant(participantName);
        continue;
      }

      // ── Note ──────────────────────────────────────────────────────────
      const noteMatch = line.match(/^Note\s+(left\s+of|right\s+of|over)\s+(.+?)\s*:\s*(.*)$/i);
      if (noteMatch) {
        const posRaw = noteMatch[1].toLowerCase().replace(/\s+/g, ' ');
        const participantsPart = noteMatch[2].trim();
        const text = noteMatch[3].trim();

        let position: 'left' | 'right' | 'over';
        if (posRaw === 'left of') position = 'left';
        else if (posRaw === 'right of') position = 'right';
        else position = 'over';

        // Note over A,B → spans two participants
        const noteParticipants = participantsPart.split(',').map(p => p.trim());
        noteParticipants.forEach(p => ensureParticipant(p));

        notes.push({
          position,
          participants: noteParticipants,
          text: text.replace(/<br\s*\/?>/gi, '\n'),
          afterInteractionIndex: interactions.length - 1,
        });
        continue;
      }

      // ── Fragment keywords (alt, loop, opt, par, critical, break, rect, else, and, option) ──
      const fragmentOpenMatch = line.match(/^(alt|opt|loop|par|critical|break|rect)\s*(.*)?$/i);
      if (fragmentOpenMatch) {
        const fType = fragmentOpenMatch[1].toLowerCase();
        const fLabel = (fragmentOpenMatch[2] || '').trim();

        const frame: FragmentFrame = {
          id: `fragment_${fragmentCounter++}`,
          type: fType,
          label: fLabel || fType,
          startInteractionIndex: interactions.length,
          participantNames: new Set(),
        };
        fragmentStack.push(frame);
        continue;
      }

      // Section dividers within fragments (else, and, option)
      const sectionMatch = line.match(/^(else|and|option)\s*(.*)?$/i);
      if (sectionMatch && fragmentStack.length > 0) {
        // Close current fragment section and start new one
        const parentFrame = fragmentStack[fragmentStack.length - 1];
        // Record end index for the current section
        const endIndex = interactions.length - 1;
        if (endIndex >= parentFrame.startInteractionIndex) {
          completedFragments.push({ ...parentFrame, participantNames: new Set(parentFrame.participantNames) });
        }
        // Start a new section within the same fragment level
        parentFrame.startInteractionIndex = interactions.length;
        parentFrame.label = (sectionMatch[2] || sectionMatch[1]).trim();
        parentFrame.participantNames = new Set();
        continue;
      }

      // ── End keyword ───────────────────────────────────────────────────
      if (line.toLowerCase() === 'end') {
        if (currentBox) {
          // Close a box
          boxes.push(currentBox);
          currentBox = null;
        } else if (fragmentStack.length > 0) {
          // Close a fragment
          const frame = fragmentStack.pop()!;
          const endIndex = interactions.length - 1;
          if (endIndex >= frame.startInteractionIndex) {
            completedFragments.push(frame);
          }
        }
        continue;
      }

      // ── Message/Arrow line ────────────────────────────────────────────
      const arrowMatch = line.match(arrowRegex);
      if (arrowMatch) {
        const from = arrowMatch[1].trim();
        const arrowRaw = arrowMatch[2].trim();
        const modifier = arrowMatch[3] || '';     // + or - or empty
        const to = arrowMatch[4].trim();
        const message = arrowMatch[5].trim();

        const arrowInfo = ARROW_MAP[arrowRaw];
        if (!arrowInfo) continue; // Unknown arrow type, skip

        ensureParticipant(from);
        ensureParticipant(to);

        const interaction: ParsedInteraction = {
          from,
          to,
          message,
          arrowRaw,
          arrowInfo,
          activateTarget: modifier === '+',
          deactivateTarget: modifier === '-',
        };

        interactions.push(interaction);

        // Track participants in current fragment
        if (fragmentStack.length > 0) {
          const currentFrame = fragmentStack[fragmentStack.length - 1];
          currentFrame.participantNames.add(from);
          currentFrame.participantNames.add(to);
        }
        continue;
      }

      // ── Unrecognized line — ignore silently ───────────────────────────
    }

    // ── Validation ────────────────────────────────────────────────────────
    if (participantOrder.length === 0 && interactions.length === 0) {
      throw new Error('No valid Mermaid sequence diagram content found.');
    }

    // ── Build logical data ────────────────────────────────────────────────
    const logicalNodes: LogicalNode[] = [];
    const logicalEdges: LogicalEdge[] = [];
    const sequences: SequenceStep[] = [];
    const timelines: Record<string, TimelineTiming> = {};
    const annotations: Record<string, StickyNote> = {};

    // Participant ID mapping: mermaid name → internal ID
    const participantIdMap = new Map<string, string>();

    participantOrder.forEach((name, index) => {
      const id = `node_mermaid_${index}`;
      participantIdMap.set(name, id);

      const displayName = participantAliases.get(name) || name;
      const nodeType = participantTypes.get(name) || 'service';

      logicalNodes.push({
        id,
        name: displayName,
        type: nodeType,
        properties: {},
      });
    });

    // ── Fragment → Section nodes ──────────────────────────────────────────
    // Create section nodes for completed fragments
    completedFragments.forEach((fragment) => {
      const sectionId = `section_${fragment.id}`;

      logicalNodes.push({
        id: sectionId,
        name: fragment.label,
        type: 'section',
        properties: {
          fragmentType: fragment.type,
        },
      });

      // Set parentId on participants that are inside the fragment
      // We don't set parentId on participant nodes directly because a
      // participant can span multiple fragments. Instead, the fragment
      // bounds are computed from the edges (sequences) within the fragment.
      // The SeqFragmentNode positions itself by computing which participants
      // and slots are inside it.
    });

    // ── Box → Section nodes ──────────────────────────────────────────────
    boxes.forEach((box) => {
      const sectionId = `section_${box.id}`;

      logicalNodes.push({
        id: sectionId,
        name: box.label,
        type: 'section',
        properties: {
          boxColor: box.color,
        },
      });

      // Set parentId on participants within this box
      box.participantNames.forEach(pName => {
        const nodeId = participantIdMap.get(pName);
        if (nodeId) {
          const node = logicalNodes.find(n => n.id === nodeId);
          if (node) {
            node.parentId = sectionId;
          }
        }
      });
    });

    // ── Interactions → Edges & Sequences ─────────────────────────────────
    const edgeMap = new Map<string, string>(); // "sourceId-targetId" → edgeId
    let currentTime = 0;
    const stepDuration = 1000;
    let stepNumber = 1;

    interactions.forEach((interaction, index) => {
      const sourceId = participantIdMap.get(interaction.from)!;
      const targetId = participantIdMap.get(interaction.to)!;

      const isReturn = interaction.arrowInfo.isDotted && interaction.arrowInfo.hasArrowhead;
      const isAsync = interaction.arrowInfo.isOpenArrow ||
                      (interaction.arrowInfo.isDotted && !interaction.arrowInfo.hasArrowhead);

      // Edge lookup: reuse existing edge for same pair (bidirectional)
      const edgeKey1 = `${sourceId}-${targetId}`;
      const edgeKey2 = `${targetId}-${sourceId}`;

      let edgeId = edgeMap.get(edgeKey1) || edgeMap.get(edgeKey2);

      if (!edgeId) {
        edgeId = `edge_mermaid_${index}`;
        edgeMap.set(edgeKey1, edgeId);
        logicalEdges.push({
          id: edgeId,
          sourceId,
          targetId,
          description: interaction.message,
          isAsync: isAsync,
          properties: {
            arrowType: interaction.arrowRaw,
            isLost: interaction.arrowInfo.isLost,
          },
        });
      }

      // Return message handling: mark previous step as round-trip
      if (isReturn) {
        const lastStepForEdge = [...sequences].reverse().find(s => s.edgeId === edgeId);
        if (lastStepForEdge) {
          lastStepForEdge.isRoundTrip = true;
          if (timelines[lastStepForEdge.id]) {
            timelines[lastStepForEdge.id].duration += 500;
            if (!timelines[lastStepForEdge.id].internalProcess) {
              timelines[lastStepForEdge.id].internalProcess = { text: interaction.message, duration: 500 };
            }
          }
          return; // Don't create a new sequence step for the return
        }
      }

      // Forward message — create new sequence step
      const stepId = `step_${index}`;
      sequences.push({
        id: stepId,
        stepNumber: stepNumber++,
        edgeId,
        isAsync: isAsync,
      });

      timelines[stepId] = {
        sequenceId: stepId,
        duration: stepDuration,
        delay: currentTime,
      };

      currentTime += stepDuration;
    });

    // ── Notes → StickyNote annotations ───────────────────────────────────
    notes.forEach((note, noteIndex) => {
      const noteId = `note_mermaid_${noteIndex}`;

      // Determine timing based on the interaction this note follows
      let startTime = 0;
      let endTime = currentTime || stepDuration;

      if (note.afterInteractionIndex >= 0 && note.afterInteractionIndex < interactions.length) {
        // Position the note at the same time as the interaction it follows
        const stepId = `step_${note.afterInteractionIndex}`;
        const timing = timelines[stepId];
        if (timing) {
          startTime = timing.delay;
          endTime = startTime + timing.duration;
        }
      }

      // Determine position hint for the note header
      const posLabel = note.position === 'left' ? '← '
                     : note.position === 'right' ? '→ '
                     : '↔ ';
      const participantNames = note.participants
        .map(p => participantAliases.get(p) || p)
        .join(', ');

      annotations[noteId] = {
        id: noteId,
        header: `${posLabel}${participantNames}`,
        body: note.text,
        style: {
          backgroundColor: '#fef9c3',  // Light yellow
          borderColor: '#fbbf24',
          textColor: '#78350f',
          fontFamily: 'Inter',
          fontSize: 12,
          borderRadius: 8,
          opacity: 0.95,
        },
        startTime,
        endTime,
        alwaysVisible: true,
      };
    });

    // ── Assign fragment parentId to participants ─────────────────────────
    // For each completed fragment, set parentId on participants that are
    // involved in the fragment. This allows the layout engine to compute
    // fragment bounds via computeFragmentBounds().
    completedFragments.forEach((fragment) => {
      const sectionId = `section_${fragment.id}`;
      fragment.participantNames.forEach((pName) => {
        const nodeId = participantIdMap.get(pName);
        if (nodeId) {
          const node = logicalNodes.find(n => n.id === nodeId);
          // Only set parentId if the node doesn't already belong to a box
          // (boxes take precedence since they're explicit groupings)
          if (node && !node.parentId) {
            node.parentId = sectionId;
          }
        }
      });
    });

    // ── Build output ──────────────────────────────────────────────────────
    const logicalData: LogicalDiagram = {
      schemaVersion: 1,
      nodes: logicalNodes,
      edges: logicalEdges,
      sequences,
    };

    const visualData = generateLayout(logicalData);
    visualData.timelines = timelines;

    // Add annotations to visual data
    if (Object.keys(annotations).length > 0) {
      visualData.annotations = annotations;
    }

    return { logicalData, visualData };
  }
};
