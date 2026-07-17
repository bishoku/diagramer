import { DiagramAdapter, ImportFilter } from './types';
import { LogicalDiagram, LogicalNode, LogicalEdge, SequenceStep, VisualDiagram, TimelineTiming } from '../types';
import { generateLayout } from './layoutGenerator';

/**
 * Parses Grafana Tempo OpenTelemetry (OTLP) JSON format.
 */
export const tempoAdapter: DiagramAdapter = {
  id: 'tempo-otlp',
  name: 'Grafana Tempo (OTLP)',
  description: 'Import OpenTelemetry JSON trace exports from Grafana Tempo.',
  supportedFormats: ['.json'],
  importMethod: 'text-modal',

  parse: async (rawInput: string, filters?: ImportFilter): Promise<{ logicalData: LogicalDiagram; visualData: VisualDiagram }> => {
    let data;
    try {
      data = JSON.parse(rawInput);
    } catch (e) {
      throw new Error('Invalid JSON file.');
    }

    // 1. Flatten spans and extract services
    interface NormalizedSpan {
      traceId: string;
      spanId: string;
      parentSpanId?: string;
      serviceName: string;
      name: string;
      startTime: number;
      endTime: number;
      attributes: Record<string, string>;
    }

    const spans: NormalizedSpan[] = [];
    // Helper to traverse and extract OTLP
    const extractSpans = (resourceSpans: any[]) => {
      for (const rs of resourceSpans) {
        let serviceName = 'unknown-service';
        if (rs.resource?.attributes) {
          const srvAttr = rs.resource.attributes.find((a: any) => a.key === 'service.name');
          if (srvAttr?.value?.stringValue) {
            serviceName = srvAttr.value.stringValue;
          }
        }

        if (rs.scopeSpans) {
          for (const ss of rs.scopeSpans) {
            if (ss.spans) {
              for (const span of ss.spans) {
                const attributes: Record<string, string> = {};
                if (span.attributes) {
                  for (const attr of span.attributes) {
                    if (attr.value?.stringValue) attributes[attr.key] = attr.value.stringValue;
                    if (attr.value?.intValue) attributes[attr.key] = attr.value.intValue;
                    if (attr.value?.boolValue !== undefined) attributes[attr.key] = String(attr.value.boolValue);
                  }
                }

                spans.push({
                  traceId: span.traceId,
                  spanId: span.spanId,
                  parentSpanId: span.parentSpanId,
                  serviceName,
                  name: span.name,
                  startTime: parseInt(span.startTimeUnixNano || '0', 10),
                  endTime: parseInt(span.endTimeUnixNano || '0', 10),
                  attributes,
                });
              }
            }
          }
        }
      }
    };

    // Helper: extract service name from resource attributes
    const extractServiceName = (resource: any): string => {
      if (!resource?.attributes) return 'unknown-service';
      const attrs = resource.attributes;
      // Attributes can be an array of {key, value} or a plain object
      if (Array.isArray(attrs)) {
        const found = attrs.find((a: any) => a.key === 'service.name');
        return found?.value?.stringValue ?? found?.value?.Value?.StringValue ?? 'unknown-service';
      }
      return attrs['service.name'] ?? 'unknown-service';
    };

    if (data.batches) {
      for (const batch of data.batches) {
        if (batch.resourceSpans) {
          // OTLP protobuf-JSON format: batches[].resourceSpans[]
          extractSpans(batch.resourceSpans);
        } else if (batch.resource !== undefined) {
          // Grafana Tempo native export format:
          // batches[].resource + batches[].instrumentationLibrarySpans[] or scopeSpans[]
          const serviceName = extractServiceName(batch.resource);
          const spanGroups = batch.instrumentationLibrarySpans ?? batch.scopeSpans ?? [];
          for (const group of spanGroups) {
            for (const span of (group.spans ?? [])) {
              const attributes: Record<string, string> = {};
              if (span.attributes) {
                for (const attr of span.attributes) {
                  if (attr.value?.stringValue !== undefined) attributes[attr.key] = attr.value.stringValue;
                  else if (attr.value?.intValue !== undefined) attributes[attr.key] = attr.value.intValue;
                  else if (attr.value?.Value?.StringValue !== undefined) attributes[attr.key] = attr.value.Value.StringValue;
                  else if (attr.value?.Value?.IntValue !== undefined) attributes[attr.key] = attr.value.Value.IntValue;
                  else if (attr.value?.boolValue !== undefined) attributes[attr.key] = String(attr.value.boolValue);
                }
              }
              spans.push({
                traceId: span.traceId ?? span.trace_id ?? '',
                spanId: span.spanId ?? span.span_id ?? '',
                parentSpanId: span.parentSpanId ?? span.parent_span_id,
                serviceName,
                name: span.name ?? '',
                startTime: parseInt(span.startTimeUnixNano ?? span.start_time_unix_nano ?? '0', 10),
                endTime: parseInt(span.endTimeUnixNano ?? span.end_time_unix_nano ?? '0', 10),
                attributes,
              });
            }
          }
        }
      }
    } else if (data.resourceSpans) {
      extractSpans(data.resourceSpans);
    } else if (Array.isArray(data)) {
      // Sometimes just an array of resourceSpans
      extractSpans(data);
    } else {
      throw new Error('Unsupported JSON structure. Expected OTLP or Grafana Tempo format.');
    }


    if (spans.length === 0) {
      throw new Error('No spans found in the provided file.');
    }

    // 2. Sort spans by start time chronologically
    spans.sort((a, b) => a.startTime - b.startTime);

    // 2. Filter spans by requested types or AST
    let filteredSpans = spans;
    
    if (filters?.ast) {
      // Import the evaluator dynamically or make sure it's available.
      // Wait, we can't dynamically import easily if it's synchronous without await, but parse is async!
      // Let's import it at the top of the file.
      const { evaluateFilterAST } = await import('../utils/filterEvaluator');
      
      const activeServices = new Set<string>();
      spans.forEach(span => {
        // Evaluate the span attributes (combining with serviceName for convenience if they want to filter by serviceName)
        const combinedAttributes = {
          ...span.attributes,
          'service.name': span.serviceName,
          'span.name': span.name,
          'span.duration': Math.max(100, Math.floor((span.endTime - span.startTime) / 1000000))
        };
        
        if (evaluateFilterAST(combinedAttributes, filters.ast)) {
          activeServices.add(span.serviceName);
        }
      });

      if (activeServices.size > 0) {
        filteredSpans = spans.filter(span => activeServices.has(span.serviceName));
      } else {
        filteredSpans = spans; // Fallback if no match
      }
      
    } else if (filters?.types && filters.types.length > 0) {
      // Legacy basic filter
      const activeServices = new Set<string>();
      spans.forEach(span => {
        const keys = Object.keys(span.attributes);
        const isHttp = keys.some(k => k.startsWith('http.'));
        const isSql = keys.some(k => k.startsWith('db.') || k.startsWith('sql.'));
        const isGrpc = keys.some(k => k.startsWith('rpc.'));
        const matchesFilter =
          (filters.types!.includes('http') && isHttp) ||
          (filters.types!.includes('sql') && isSql) ||
          (filters.types!.includes('grpc') && isGrpc);
        if (matchesFilter) {
          activeServices.add(span.serviceName);
        }
      });

      if (activeServices.size > 0) {
        filteredSpans = spans.filter(span => activeServices.has(span.serviceName));
      } else {
        filteredSpans = spans; // fallback: no filter matched anything, show all
      }
    }

    // 3. Create LogicalNodes
    const services = new Set<string>();
    filteredSpans.forEach(s => services.add(s.serviceName));

    const nodes: LogicalNode[] = Array.from(services).map(serviceName => {
      let nodeType = 'service';
      
      // Infer node type by checking spans belonging to this service
      const serviceSpans = filteredSpans.filter(s => s.serviceName === serviceName);
      const isDb = serviceSpans.some(s => 
        Object.keys(s.attributes).some(k => k.startsWith('db.'))
      ) || serviceName.toLowerCase().includes('db') || serviceName.toLowerCase().includes('database') || serviceName.toLowerCase().includes('redis');

      if (isDb) {
        nodeType = 'database';
      } else if (
        serviceName.toLowerCase().includes('queue') || 
        serviceName.toLowerCase().includes('rabbitmq') || 
        serviceName.toLowerCase().includes('kafka') || 
        serviceSpans.some(s => s.name.toLowerCase().includes('queue') || s.name.toLowerCase().includes('kafka') || s.name.toLowerCase().includes('publish') || s.name.toLowerCase().includes('consume'))
      ) {
        nodeType = 'queue';
      } else if (
        serviceName.toLowerCase().includes('gateway') || 
        serviceSpans.some(s => s.name.toLowerCase().includes('gateway'))
      ) {
        nodeType = 'gateway';
      } else if (
        serviceSpans.some(s => 
          Object.keys(s.attributes).some(k => k.startsWith('http.') || k.startsWith('rpc.'))
        )
      ) {
        nodeType = 'server';
      }

      return {
        id: `node-${serviceName.replace(/[^a-zA-Z0-9]/g, '-')}`,
        name: serviceName,
        type: nodeType,
      };
    });

    const getServiceId = (serviceName: string) => `node-${serviceName.replace(/[^a-zA-Z0-9]/g, '-')}`;

    // 4. Create LogicalEdges and Sequences
    const edges: LogicalEdge[] = [];
    const sequences: SequenceStep[] = [];
    const timelines: Record<string, TimelineTiming> = {};

    let stepCounter = 1;
    const spanMap = new Map<string, NormalizedSpan>();
    filteredSpans.forEach(s => spanMap.set(s.spanId, s));

    const edgeMap = new Map<string, string>(); // track source-target uniqueness

    for (const span of filteredSpans) {
      if (!span.parentSpanId) continue; // Root span has no incoming edge
      
      const parentSpan = spanMap.get(span.parentSpanId);
      if (!parentSpan) continue; // Parent might have been filtered out or not in trace

      if (parentSpan.serviceName === span.serviceName) {
         // Internal span within the same service, skip visual edge for now
         continue;
      }

      const sourceId = getServiceId(parentSpan.serviceName);
      const targetId = getServiceId(span.serviceName);
      const edgeKey = `${sourceId}-${targetId}`;

      let edgeId = edgeMap.get(edgeKey);
      if (!edgeId) {
        edgeId = `edge-${crypto.randomUUID()}`;
        edgeMap.set(edgeKey, edgeId);

        let protocol = 'TCP';
        if (span.attributes['http.method']) protocol = 'HTTP';
        if (span.attributes['db.system']) protocol = 'SQL';
        if (span.attributes['rpc.system']) protocol = 'gRPC';

        edges.push({
          id: edgeId,
          sourceId,
          targetId,
          isAsync: false, // Default sync
          protocol,
          description: span.name
        });
      }

      const sequenceId = `seq-${crypto.randomUUID()}`;
      sequences.push({
        id: sequenceId,
        stepNumber: stepCounter++,
        edgeId: edgeId,
        isAsync: false,
        isRoundTrip: true,
        animationMode: 'roundTrip'
      });

      // Calculate timing (convert nano to milli)
      const durationMs = Math.max(100, Math.floor((span.endTime - span.startTime) / 1000000));
      // delay from parent start (just a rough estimate for visual playback)
      const delayMs = Math.max(0, Math.floor((span.startTime - parentSpan.startTime) / 1000000));

      timelines[sequenceId] = {
        sequenceId,
        duration: Math.min(durationMs, 5000), // Cap to 5s for playback sanity
        delay: Math.min(delayMs, 2000),
        internalProcess: {
          text: span.name,
          duration: 1000
        }
      };
    }

    const logicalData: LogicalDiagram = {
      schemaVersion: 1,
      nodes,
      edges,
      sequences
    };

    // 5. Generate Layout
    const visualData = generateLayout(logicalData, { timelines }, 'LR');

    return { logicalData, visualData };
  },
  extractMetadata: async (rawInput: string) => {
    let data;
    try {
      data = JSON.parse(rawInput);
    } catch (e) {
      throw new Error('Invalid JSON file.');
    }

    const attributeTypes = new Map<string, 'string' | 'number' | 'boolean'>();
    const attributeValues = new Map<string, Set<string | number | boolean>>();

    const recordAttribute = (key: string, value: any) => {
      if (!attributeTypes.has(key)) {
        if (typeof value === 'boolean') attributeTypes.set(key, 'boolean');
        else if (typeof value === 'number') attributeTypes.set(key, 'number');
        else attributeTypes.set(key, 'string');
      }

      let valSet = attributeValues.get(key);
      if (!valSet) {
        valSet = new Set();
        attributeValues.set(key, valSet);
      }
      // Limit to 50 unique values per attribute to prevent memory bloat
      if (valSet.size < 50 && value !== undefined && value !== null && value !== '') {
        valSet.add(value);
      }
    };

    const processAttributes = (attrs: any) => {
      if (!attrs) return;
      if (Array.isArray(attrs)) {
        for (const attr of attrs) {
          if (attr.value?.stringValue !== undefined) recordAttribute(attr.key, attr.value.stringValue);
          else if (attr.value?.intValue !== undefined) recordAttribute(attr.key, Number(attr.value.intValue));
          else if (attr.value?.Value?.StringValue !== undefined) recordAttribute(attr.key, attr.value.Value.StringValue);
          else if (attr.value?.Value?.IntValue !== undefined) recordAttribute(attr.key, Number(attr.value.Value.IntValue));
          else if (attr.value?.boolValue !== undefined) recordAttribute(attr.key, attr.value.boolValue);
        }
      } else {
        for (const key of Object.keys(attrs)) {
          recordAttribute(key, attrs[key]);
        }
      }
    };

    const extractFromSpans = (resourceSpans: any[]) => {
      for (const rs of resourceSpans) {
        if (rs.resource?.attributes) {
          processAttributes(rs.resource.attributes);
        }
        if (rs.scopeSpans) {
          for (const ss of rs.scopeSpans) {
            if (ss.spans) {
              for (const span of ss.spans) {
                if (span.attributes) processAttributes(span.attributes);
              }
            }
          }
        }
      }
    };

    if (data.batches) {
      for (const batch of data.batches) {
        if (batch.resourceSpans) {
          extractFromSpans(batch.resourceSpans);
        } else if (batch.resource !== undefined) {
          if (batch.resource.attributes) processAttributes(batch.resource.attributes);
          const spanGroups = batch.instrumentationLibrarySpans ?? batch.scopeSpans ?? [];
          for (const group of spanGroups) {
            for (const span of (group.spans ?? [])) {
              if (span.attributes) processAttributes(span.attributes);
            }
          }
        }
      }
    } else if (data.resourceSpans) {
      extractFromSpans(data.resourceSpans);
    } else if (Array.isArray(data)) {
      extractFromSpans(data);
    }

    // Add implicit standard attributes
    recordAttribute('service.name', 'string');
    recordAttribute('span.name', 'string');
    recordAttribute('span.duration', 'number');

    const attributes = Array.from(attributeTypes.entries()).map(([key, type]) => ({
      key,
      type,
      values: Array.from(attributeValues.get(key) || [])
    }));

    // Sort alphabetically
    attributes.sort((a, b) => a.key.localeCompare(b.key));

    return { attributes };
  }
};
