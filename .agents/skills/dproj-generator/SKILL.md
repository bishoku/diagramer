---
name: dproj-generator
description: >
  Generate YADA .dproj project files from natural language descriptions of
  distributed system architectures, design patterns, and data flows.
  Use this skill when a user asks to visualize, diagram, or simulate any
  architecture pattern (SAGA, CQRS, Event Sourcing, microservices flows, etc.)
  with YADA. The output is a .dproj ZIP archive the user can import directly.
---

# YADA .dproj Generator

YADA is an interactive architecture diagramming tool with real-time flow simulation. Generate `.dproj` files (ZIP archives) users can import to visualize and simulate distributed system patterns.

## .dproj Structure

ZIP containing `workspace.json` + `diagram.json` (+ optional `components/` folder).

**workspace.json**: `{ "name": "...", "description": "...", "path": "virtual://workspace/imported", "lastModified": "ISO8601" }`

**diagram.json**: `{ "schemaVersion": 1, "logicalData": LogicalDiagram, "visualData": VisualDiagram }`

## Data Model

Two layers — **both required**. Logical (what exists, how connected) + Visual (where drawn, how animated).

### LogicalDiagram

```
{ schemaVersion: 1, nodes: LogicalNode[], edges: LogicalEdge[], sequences: SequenceStep[] }
```

**LogicalNode**: `{ id, type, name, parentId?, properties? }`
- `type` must be one of: `client` | `load_balancer` | `gateway` | `server` | `database` | `cache` | `queue` | `firewall` | `section` | `sticky_note`
- `server` is the catch-all for any microservice/backend. Do NOT invent types.
- `parentId` references a `section` node for grouping.

**LogicalEdge**: `{ id, sourceId, targetId, isAsync, protocol?, description?, properties? }`
- `isAsync: true` = fire-and-forget/event; `false` = synchronous request.

**SequenceStep**: `{ id, stepNumber, edgeId, isAsync, isRoundTrip?, animationMode?, repeatParticleCount? }`
- Same `stepNumber` = parallel execution. Different = sequential.
- `isRoundTrip: true` = animate A→B→A (request+response).
- `animationMode`: `'normal'` | `'roundTrip'` | `'repeat'`

### VisualDiagram

```
{ canvas: { zoom, pan: {x,y}, gridVisible?, bgColor? },
  layoutNodes: Record<id, VisualNode>,
  layoutEdges: Record<id, VisualEdge>,
  timelines: Record<id, TimelineTiming>,
  annotations?: Record<id, StickyNote> }
```

**VisualNode**: `{ id, x, y, width?(224), height?(52), theme?, zIndex?, handles?, displayMode?, rotation?, customStyles? }`
- Themes: `indigo`(clients) | `emerald`(gateways) | `rose`(databases) | `amber`(servers) | `violet`(queues) | `cyan`(caches)
- Section nodes: `zIndex: -1`, sized to enclose children + 40px padding.
- `handles`: array of `{ id, side, offset }`. If omitted, the node gets 4 default handles (top/right/bottom/left all at offset 50).

**VisualEdge**: `{ id, sourceHandle?, targetHandle?, particleType?, showArrow?(true), color? }`
- Handles format: `"side:offset"` e.g. `"right:50"`, `"top:25"`. Offset = 0-100%.
- Particles: `dot` | `arrow` | `envelope` | `rest` | `grpc` | `ws` | `graphql` | `kafka` | `pkg` | `sql`
- LR layout: source=`right:50`, target=`left:50`. TB layout: source=`bottom:50`, target=`top:50`.

**TimelineTiming**: `{ sequenceId, duration(ms), delay(ms), internalProcess?: { text, duration } }`
- `delay` = cumulative start time. Sequential: `delay = prev.delay + prev.duration`. Parallel: same delay.
- Duration guide: internal 500-800ms, HTTP 800-1200ms, DB 500-1000ms, external 1000-2000ms, async publish 300-600ms.

### ⚠️ Sticky Notes require THREE entries (critical)

A sticky note is NOT a standalone annotation object. It requires **all three** of:

**1. `logicalData.nodes`** — a node with `type: "sticky_note"`:
```json
{"id": "note-1", "type": "sticky_note", "name": "My Note", "properties": {"_visualOnly": true}}
```

**2. `visualData.layoutNodes`** — position and size for that ID:
```json
"note-1": {"id": "note-1", "x": 100, "y": 200, "width": 260, "height": 160}
```

**3. `visualData.annotations`** — the content and style for that same ID:
```json
"note-1": {
  "id": "note-1",
  "header": "Title",
  "body": "Content line 1\nContent line 2",
  "style": {
    "backgroundColor": "#0f172a", "borderColor": "#6366f1",
    "textColor": "#e2e8f0", "fontFamily": "Inter",
    "fontSize": 12, "borderRadius": 8, "opacity": 0.95
  },
  "startTime": 0, "endTime": 9999, "alwaysVisible": true
}
```

- `alwaysVisible: true` → always shown. `false` → only shown during `[startTime, endTime]` ms window.
- Sticky notes **cannot have edges** — they are visual-only.
- Default size: 260×160px. Place them away from other nodes to avoid overlap.

## Layout Rules

- Node default: 224×52px. Spacing: 300-350px horizontal, 150-200px vertical, 100px minimum gap.
- Section nodes enclose children with 40px padding on all sides.

### ⚠️ Section Child Coordinates (critical)

Nodes with `parentId` use **section-relative coordinates** — (0,0) is the section's top-left corner, NOT the canvas origin.

```
child.x = absolute_canvas_x - section.x
child.y = absolute_canvas_y - section.y
```

Example — section at canvas (1000, 200), child node at canvas (1060, 280):
```json
"s-backend": { "id":"s-backend", "x":1000, "y":200, "width":500, "height":300, "zIndex":-1 },
"n-api":     { "id":"n-api",     "x":60,   "y":80,  "width":224, "height":52  }
```
The `60` and `80` are relative to the section — NOT canvas coordinates.

Section bounds must enclose all children: `section.width ≥ child.x + child.width + 40`, same for height.

### ⚠️ Handle Consistency Rule (critical)

Every handle ID used in `layoutEdges.sourceHandle` / `targetHandle` **must exist** in the source/target `layoutNode.handles` array. If a node has no `handles` array, it only has the 4 default handles: `top:50`, `right:50`, `bottom:50`, `left:50`.

**Rule:** If you use any non-default offset (e.g. `right:25`, `bottom:33`), you MUST declare it in the node's `handles` array AND keep the default handles too — otherwise the edge will not connect.

Example — node with default handles + one extra:
```json
"n-client": {
  "id": "n-client", "x": 0, "y": 0, "width": 224, "height": 52, "theme": "indigo",
  "handles": [
    {"id": "top:50",   "side": "top",    "offset": 50},
    {"id": "right:50", "side": "right",  "offset": 50},
    {"id": "right:25", "side": "right",  "offset": 25},
    {"id": "bottom:50","side": "bottom", "offset": 50},
    {"id": "left:50",  "side": "left",   "offset": 50}
  ]
}
```

The matching edge entry:
```json
"e-back": {"id":"e-back", "sourceHandle":"right:25", "targetHandle":"left:50", "showArrow":true}
```

**Safest approach:** Use only `right:50` / `left:50` / `top:50` / `bottom:50` (the defaults) when possible. Only add custom offsets when you need multiple parallel edges between the same pair of nodes.

## Constraints

**Hard — violation breaks import:**
1. `schemaVersion` = 1 everywhere.
2. All IDs globally unique. Visual IDs must exactly match Logical IDs.
3. All foreign keys valid: edge→node, sequence→edge, timeline→sequence.
4. Node `type` must be from the registered list above.

**Soft:**
- Section nodes have no edges — grouping only.
- Self-loop edges (sourceId===targetId) are supported.
- ~50 nodes max for good performance.
- For async flows, set `isAsync: true` on BOTH the LogicalEdge AND SequenceStep.

**Workarounds:**
- Fan-out: separate edges, same `stepNumber`.
- Retries: `animationMode: 'repeat'` + `repeatParticleCount`.
- Compensating transactions: reverse edges with higher stepNumbers.
- Branching: `section` nodes to group alternatives + annotations for conditions.

## Building the .dproj

Use the bundled script which validates all IDs, foreign keys, and node types before packing:

```bash
# 1. Write workspace.json and diagram.json to a temp directory
# 2. Run the validation + pack script:
python <skill_dir>/scripts/pack_dproj.py output.dproj /tmp/workspace.json /tmp/diagram.json
```

The script will report validation errors (missing IDs, broken references, invalid types) and exit non-zero if any are found. On success it creates the `.dproj` ZIP and prints a summary.

## Example: 3-Service Flow with Event Bus

```json
{
  "schemaVersion": 1,
  "logicalData": {
    "schemaVersion": 1,
    "nodes": [
      {"id":"n-gw","type":"gateway","name":"API Gateway"},
      {"id":"n-order","type":"server","name":"Order Service","parentId":"s-svc"},
      {"id":"n-bus","type":"queue","name":"Event Bus"},
      {"id":"n-pay","type":"server","name":"Payment Service","parentId":"s-svc"},
      {"id":"n-db","type":"database","name":"Order DB"},
      {"id":"s-svc","type":"section","name":"Services"}
    ],
    "edges": [
      {"id":"e1","sourceId":"n-gw","targetId":"n-order","isAsync":false,"protocol":"HTTP","description":"POST /order"},
      {"id":"e2","sourceId":"n-order","targetId":"n-db","isAsync":false,"protocol":"SQL","description":"INSERT"},
      {"id":"e3","sourceId":"n-order","targetId":"n-bus","isAsync":true,"protocol":"Kafka","description":"OrderCreated"},
      {"id":"e4","sourceId":"n-bus","targetId":"n-pay","isAsync":true,"protocol":"Kafka","description":"Consume"},
      {"id":"e5","sourceId":"n-pay","targetId":"n-bus","isAsync":true,"protocol":"Kafka","description":"PaymentDone"}
    ],
    "sequences": [
      {"id":"s1","stepNumber":1,"edgeId":"e1","isAsync":false,"isRoundTrip":true},
      {"id":"s2","stepNumber":2,"edgeId":"e2","isAsync":false,"isRoundTrip":true},
      {"id":"s3","stepNumber":3,"edgeId":"e3","isAsync":true},
      {"id":"s4","stepNumber":4,"edgeId":"e4","isAsync":true},
      {"id":"s5","stepNumber":5,"edgeId":"e5","isAsync":true}
    ]
  },
  "visualData": {
    "canvas":{"zoom":0.9,"pan":{"x":50,"y":50},"gridVisible":true},
    "layoutNodes":{
      "n-gw":   {"id":"n-gw",   "x":0,  "y":100,"width":224,"height":52,"theme":"emerald"},
      "n-order":{"id":"n-order","x":350,"y":0,  "width":224,"height":52,"theme":"amber"},
      "n-bus":  {"id":"n-bus",  "x":350,"y":200,"width":224,"height":52,"theme":"violet"},
      "n-pay":  {"id":"n-pay",  "x":700,"y":200,"width":224,"height":52,"theme":"amber"},
      "n-db":   {"id":"n-db",   "x":700,"y":0,  "width":224,"height":52,"theme":"rose"},
      "s-svc":  {"id":"s-svc",  "x":310,"y":-50,"width":660,"height":340,"zIndex":-1,"theme":"amber"}
    },
    "layoutEdges":{
      "e1":{"id":"e1","sourceHandle":"right:50","targetHandle":"left:50","particleType":"rest","showArrow":true},
      "e2":{"id":"e2","sourceHandle":"right:50","targetHandle":"left:50","particleType":"sql","showArrow":true},
      "e3":{"id":"e3","sourceHandle":"bottom:50","targetHandle":"top:50","particleType":"kafka","showArrow":true},
      "e4":{"id":"e4","sourceHandle":"right:50","targetHandle":"left:50","particleType":"kafka","showArrow":true},
      "e5":{"id":"e5","sourceHandle":"top:50","targetHandle":"bottom:50","particleType":"kafka","showArrow":true}
    },
    "timelines":{
      "s1":{"sequenceId":"s1","duration":800,"delay":0,"internalProcess":{"text":"Routing","duration":300}},
      "s2":{"sequenceId":"s2","duration":600,"delay":800,"internalProcess":{"text":"INSERT order","duration":300}},
      "s3":{"sequenceId":"s3","duration":400,"delay":1400},
      "s4":{"sequenceId":"s4","duration":500,"delay":1800},
      "s5":{"sequenceId":"s5","duration":400,"delay":2300}
    }
  }
}
```

## Pattern Recipes

- **SAGA Orchestration**: Central orchestrator `server` with round-trip edges to each participant. Sequential stepNumbers.
- **SAGA Choreography**: Services chained through `queue` event bus. Each publishes → next consumes.
- **CQRS**: Separate `server` nodes for Command/Query. Event Bus bridges write→read side.
- **Event Sourcing**: `database` as Event Store, services publish/consume event streams.
- **API Gateway Fan-out**: `client`→`gateway`→multiple `server`s. Same `stepNumber` for parallel calls.
- **Circuit Breaker**: `firewall` node as breaker. Use `internalProcess` for state annotations.
