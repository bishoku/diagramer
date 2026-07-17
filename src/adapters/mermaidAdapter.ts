import { DiagramAdapter } from './types';
import { LogicalDiagram, LogicalNode, LogicalEdge, SequenceStep, VisualDiagram, TimelineTiming } from '../types';
import { generateLayout } from './layoutGenerator';

export const mermaidAdapter: DiagramAdapter = {
  id: 'mermaid-sequence',
  name: 'Mermaid Sequence Diagram',
  description: 'Import basic Mermaid.js sequence diagrams (participants and messages)',
  importMethod: 'text-modal',
  supportedFormats: ['.mmd', '.txt'],

  parse: async (rawInput: string): Promise<{ logicalData: LogicalDiagram; visualData: VisualDiagram }> => {
    const lines = rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const participants = new Set<string>();
    const interactions: Array<{ from: string, to: string, message: string, arrow: string }> = [];

    const arrowRegex = /^(.*?)(-->>|->>|-->|->)(.*?):(.*)$/;

    for (const line of lines) {
        if (line.startsWith('participant ')) {
            let part = line.substring('participant '.length).trim();
            if (part.includes(' as ')) part = part.split(' as ')[0].trim();
            participants.add(part);
        } else if (line.startsWith('actor ')) {
            let part = line.substring('actor '.length).trim();
            if (part.includes(' as ')) part = part.split(' as ')[0].trim();
            participants.add(part);
        } else {
            const match = line.match(arrowRegex);
            if (match) {
                const from = match[1].trim();
                const arrow = match[2].trim();
                const to = match[3].trim();
                const message = match[4].trim();
                
                participants.add(from);
                participants.add(to);
                
                interactions.push({ from, to, message, arrow });
            }
        }
    }

    if (participants.size === 0 && interactions.length === 0) {
        throw new Error('No valid Mermaid sequence diagram content found.');
    }

    const logicalNodes: LogicalNode[] = [];
    const logicalEdges: LogicalEdge[] = [];
    const sequences: SequenceStep[] = [];
    const timelines: Record<string, TimelineTiming> = {};

    const participantMap = new Map<string, string>();

    Array.from(participants).forEach((name, index) => {
        const id = `node_mermaid_${index}`;
        participantMap.set(name, id);
        logicalNodes.push({
            id,
            name,
            type: 'service',
            properties: {},
        });
    });

    const edgeMap = new Map<string, string>(); 
    let currentTime = 0;
    const stepDuration = 1000;
    let stepNumber = 1;

    interactions.forEach((interaction, index) => {
        const sourceId = participantMap.get(interaction.from)!;
        const targetId = participantMap.get(interaction.to)!;
        const isReturn = interaction.arrow === '-->>' || interaction.arrow === '-->';

        const edgeKey1 = `${sourceId}-${targetId}`;
        const edgeKey2 = `${targetId}-${sourceId}`;
        
        let edgeId = edgeMap.get(edgeKey1) || edgeMap.get(edgeKey2);
        
        if (!edgeId) {
            edgeId = `edge_mermaid_${index}`;
            // Always store the edge in the direction of the first message
            edgeMap.set(edgeKey1, edgeId);
            logicalEdges.push({
                id: edgeId,
                sourceId,
                targetId,
                description: interaction.message,
                isAsync: false,
                properties: {},
            });
        }

        if (isReturn) {
            // Find the last sequence step for this edge
            const lastStepForEdge = [...sequences].reverse().find(s => s.edgeId === edgeId);
            if (lastStepForEdge) {
                lastStepForEdge.isRoundTrip = true;
                if (timelines[lastStepForEdge.id]) {
                     // Optionally extend duration to represent the return trip?
                     // Or add tooltip
                     timelines[lastStepForEdge.id].duration += 500;
                     if (!timelines[lastStepForEdge.id].internalProcess) {
                         timelines[lastStepForEdge.id].internalProcess = { text: interaction.message, duration: 500 };
                     }
                }
                return; // Do not push a new sequence step
            }
        }

        // Forward message or no prior step found for return message
        const stepId = `step_${index}`;
        sequences.push({
            id: stepId,
            stepNumber: stepNumber++,
            edgeId,
            isAsync: false,
        });

        timelines[stepId] = {
            sequenceId: stepId,
            duration: stepDuration,
            delay: currentTime,
        };

        currentTime += stepDuration;
    });

    const logicalData: LogicalDiagram = {
        schemaVersion: 1,
        nodes: logicalNodes,
        edges: logicalEdges,
        sequences,
    };

    const visualData = generateLayout(logicalData);
    visualData.timelines = timelines;

    return { logicalData, visualData };
  }
};
