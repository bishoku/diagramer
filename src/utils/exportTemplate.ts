import { LogicalDiagram, VisualDiagram, CustomComponentTemplate } from '../types';

/**
 * Generates a single, self-contained standalone HTML file containing the entire diagram,
 * custom SVG assets, active timeline sequences, and a JavaScript animation engine.
 */
export const generateStandaloneHtml = (
  logicalData: LogicalDiagram,
  visualData: VisualDiagram,
  libraryComponents: CustomComponentTemplate[]
): string => {
  const logicalJson = JSON.stringify(logicalData);
  const visualJson = JSON.stringify(visualData);
  const libraryJson = JSON.stringify(libraryComponents);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architectural Diagram & Simulation Runner</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ===== Theme Variables ===== */
    :root {
      --bg-body: #020617;
      --bg-surface: #0f172a;
      --bg-canvas: #0b0f19;
      --bg-canvas-dot: #1e293b;
      --color-text: #f8fafc;
      --color-text-muted: #64748b;
      --color-border: #1e293b;
      --color-border-subtle: #334155;
      --bg-node-card: #0f172a;
      --node-name-color: #f8fafc;
      --bg-steps-panel: rgba(15, 23, 42, 0.9);
      --bg-zoom-btn: rgba(15, 23, 42, 0.85);
      --shadow-node: 0 10px 15px -3px rgba(0,0,0,0.3);
    }
    html.light {
      --bg-body: #f8fafc;
      --bg-surface: #ffffff;
      --bg-canvas: #f1f5f9;
      --bg-canvas-dot: #cbd5e1;
      --color-text: #0f172a;
      --color-text-muted: #64748b;
      --color-border: #e2e8f0;
      --color-border-subtle: #e2e8f0;
      --bg-node-card: #ffffff;
      --node-name-color: #0f172a;
      --bg-steps-panel: rgba(255,255,255,0.92);
      --bg-zoom-btn: rgba(255,255,255,0.9);
      --shadow-node: 0 4px 12px -2px rgba(0,0,0,0.1);
    }

    body {
      background-color: var(--bg-body);
      color: var(--color-text);
      font-family: 'Outfit', sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
    }

    /* Top Navigation bar */
    header {
      height: 60px;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-dot {
      width: 10px;
      height: 10px;
      background-color: #6366f1;
      border-radius: 50%;
      box-shadow: 0 0 10px #6366f1;
    }
    .logo-text {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Simulation Canvas */
    #canvas-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background-color: var(--bg-canvas);
      background-image: radial-gradient(var(--bg-canvas-dot) 1px, transparent 1px);
      background-size: 20px 20px;
      user-select: none;
      cursor: grab;
    }
    #canvas-container:active {
      cursor: grabbing;
    }
    #canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform-origin: 0 0;
    }

    /* Zoom controls widget */
    .zoom-controls {
      position: absolute;
      bottom: 24px;
      left: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 20;
    }
    .zoom-controls button {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background-color: var(--bg-zoom-btn);
      backdrop-filter: blur(8px);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s, transform 0.1s;
    }
    .zoom-controls button:hover {
      background-color: #6366f1;
      color: #ffffff;
      transform: scale(1.05);
    }
    .zoom-controls button:active {
      transform: scale(0.95);
    }

    /* Nodes styles */
    .node-card {
      position: absolute;
      background-color: var(--bg-node-card);
      border: 2px solid var(--color-border);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--color-text);
      box-shadow: var(--shadow-node);
      transition: border-color 0.2s, box-shadow 0.2s;
      transform-origin: center center;
      overflow: visible;
    }
    .port-dot {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366f1;
      border: 2px solid var(--bg-node-card);
      pointer-events: none;
      z-index: 5;
    }
    .node-card.processing {
      border-color: #10b981;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
      scale: 1.02;
    }
    .node-card.node-active {
      border-color: #6366f1;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.25);
      scale: 1.02;
    }
    /* Icon-only mode: no background, just the icon */
    .node-card.icon-only {
      background: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
      padding: 0;
      justify-content: center;
    }
    .node-card.icon-only .node-icon-box {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      border-radius: 0;
    }
    .node-card.icon-only .node-icon-box svg {
      width: 70%;
      height: 70%;
    }
    .node-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background-color: rgba(99, 102, 241, 0.05);
      border: 1px solid rgba(99, 102, 241, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .node-icon-box svg {
      width: 20px;
      height: 20px;
    }
    .node-info {
      min-width: 0;
      flex: 1;
    }
    .node-name {
      font-weight: 600;
      font-size: 13px;
      color: var(--node-name-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .node-type {
      font-size: 9px;
      color: var(--color-text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    /* Vertical orientation: flex-col layout, text reads bottom-to-top */
    .node-card.vertical {
      flex-direction: column;
      padding: 16px 8px;
      justify-content: center;
      align-items: center;
    }
    .node-card.vertical .node-info {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      overflow: hidden;
      flex: 1;
    }
    .node-card.vertical .node-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Section Container Node */
    .section-card {
      position: absolute;
      border: 2px dashed var(--color-border);
      border-radius: 12px;
      background-color: rgba(99, 102, 241, 0.03);
      backdrop-filter: blur(1px);
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .section-card.processing {
      border-color: rgba(16, 185, 129, 0.5);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
    }
    .section-label {
      position: absolute;
      top: -22px;
      left: 12px;
      padding: 2px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      background-color: var(--bg-surface);
      border: 1px solid var(--color-border);
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      white-space: nowrap;
      pointer-events: none;
    }

    /* Node tooltip overlay bubbles */
    .node-tooltip {
      position: absolute;
      top: -46px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4f46e5;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      z-index: 100;
      pointer-events: none;
      animation: bounce 1s infinite alternate;
    }
    .node-tooltip-arrow {
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 8px;
      height: 8px;
      background-color: #4f46e5;
    }

    @keyframes bounce {
      from { transform: translateX(-50%) translateY(0); }
      to { transform: translateX(-50%) translateY(-4px); }
    }

    /* Flow connection paths */
    .edge-path {
      fill: none;
      stroke: var(--color-border);
      stroke-width: 2;
      transition: stroke 0.25s, stroke-width 0.25s;
    }
    .edge-path-active {
      stroke: #6366f1;
      stroke-width: 3.5;
    }
    .edge-badge-group {
      cursor: pointer;
      user-select: none;
    }

    /* Playback Control Bar */
    #control-bar {
      height: 80px;
      background-color: var(--bg-surface);
      border-top: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      z-index: 10;
    }
    .control-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .btn {
      background-color: var(--color-border);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
    }
    .btn:hover {
      background-color: var(--color-border-subtle);
      color: var(--color-text);
      transform: scale(1.05);
    }
    .btn:active {
      transform: scale(0.95);
    }
    .btn.primary {
      background-color: #4f46e5;
      border-color: #6366f1;
      color: #ffffff;
      width: 42px;
      height: 42px;
    }
    .btn.primary:hover {
      background-color: #6366f1;
    }

    /* Playback progress playhead scrubbing slider */
    .timeline-container {
      flex: 1;
      max-width: 500px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .time-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      font-family: monospace;
      width: 60px;
    }
    .slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 5px;
      border-radius: 3px;
      background: var(--color-border);
      outline: none;
      cursor: pointer;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #6366f1;
      border: 2px solid #ffffff;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
      transition: transform 0.1s;
    }
    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .speed-select {
      background-color: var(--color-border);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text);
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }

    /* List of active steps panel */
    #steps-panel {
      position: absolute;
      top: 80px;
      right: 24px;
      width: 280px;
      max-height: calc(100vh - 180px);
      background-color: var(--bg-steps-panel);
      backdrop-filter: blur(10px);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 16px;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      z-index: 5;
    }
    /* Theme toggle button */
    #theme-toggle {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s;
    }
    #theme-toggle:hover {
      background-color: var(--color-border);
      color: var(--color-text);
    }
    .steps-title {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .step-item {
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid transparent;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .step-item.active {
      background-color: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.25);
    }
    .step-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .step-order {
      font-size: 9px;
      font-weight: 700;
      background-color: var(--color-border);
      color: var(--color-text-muted);
      padding: 2px 6px;
      border-radius: 6px;
    }
    .step-item.active .step-order {
      background-color: #4f46e5;
      color: #ffffff;
    }
    .step-label {
      font-weight: 600;
      font-size: 11px;
      color: var(--color-text);
    }
    .step-flow {
      font-size: 10px;
      color: var(--color-text-muted);
    }
    .step-item.active .step-flow {
      color: #818cf8;
    }
    .step-description {
      font-size: 9px;
      color: var(--color-text-muted);
      margin-top: 2px;
      font-style: italic;
      line-height: 1.3;
      word-break: break-all;
    }
  </style>
</head>
<body>

  <header>
    <div class="logo">
      <div class="logo-dot"></div>
      <div class="logo-text">Architecture Simulation</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="font-size: 11px; color: var(--color-text-muted); font-weight: 600;" id="diag-name">Diagram View</div>
      <button id="theme-toggle" title="Toggle Light/Dark">
        <svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  </header>

  <div id="canvas-container">
    <div id="canvas">
      <!-- SVG overlay for rendering edges and particles -->
      <svg id="svg-edges" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:visible;"></svg>
      <!-- HTML Nodes wrapper -->
      <div id="nodes-layer" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>
    </div>

    <!-- Zoom controls panel -->
    <div class="zoom-controls">
      <button id="btn-zoom-in" title="Zoom In">+</button>
      <button id="btn-zoom-out" title="Zoom Out">-</button>
      <button id="btn-zoom-fit" title="Fit Diagram">[ ]</button>
    </div>

    <!-- Active steps display panel -->
    <div id="steps-panel">
      <div class="steps-title">Interaction Steps</div>
      <div id="steps-list"></div>
    </div>
  </div>

  <div id="control-bar">
    <div class="control-group">
      <button class="btn" id="btn-stop" title="Stop">
        <svg fill="currentColor" viewBox="0 0 24 24" width="14" height="14"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
      </button>
      <button class="btn primary" id="btn-play" title="Play">
        <svg id="play-icon" fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
      </button>
    </div>

    <div class="timeline-container">
      <span class="time-label" id="current-time-readout">0.00s</span>
      <input type="range" class="slider" id="time-slider" min="0" max="1000" value="0">
      <span class="time-label" id="total-time-readout">0.00s</span>
    </div>

    <div class="control-group">
      <select class="speed-select" id="speed-multiplier">
        <option value="0.5">0.5x</option>
        <option value="1.0" selected>1.0x</option>
        <option value="1.5">1.5x</option>
        <option value="2.0">2.0x</option>
      </select>
    </div>
  </div>

  <script>
    // Embedded initial data injected during compilation
    const initialData = {
      logicalData: ${logicalJson},
      visualData: ${visualJson},
      libraryComponents: ${libraryJson}
    };

    // State Variables
    let isPlaying = false;
    let currentTime = 0; // ms
    let playbackRate = 1.0;
    let maxDuration = 1000; // ms (calculated dynamically)
    let lastTick = null;
    let activeSequenceIds = [];

    // Pan & Zoom State
    let zoomScale = 1.0;
    let panX = 0;
    let panY = 0;


    // Resolve built-in icons
    const iconsMap = {
      client: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      gateway: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8M5 16v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/></svg>',
      server: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
      database: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
      cache: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      queue: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"><path d="m3 16 4 4 4-4M21 8l-4-4-4 4M3 16h18M21 8H3"/></svg>'
    };

    // Helper: resolve absolute position for a node (handles child nodes with parentId)
    function getAbsolutePos(nodeId) {
      const layout = initialData.visualData.layoutNodes;
      const node = initialData.logicalData.nodes.find(n => n.id === nodeId);
      const vis = layout[nodeId] || { x: 0, y: 0, width: 224, height: 52 };
      if (node && node.parentId) {
        const parentVis = layout[node.parentId] || { x: 0, y: 0 };
        return { x: vis.x + parentVis.x, y: vis.y + parentVis.y, width: vis.width || 224, height: vis.height || 52 };
      }
      return { x: vis.x, y: vis.y, width: vis.width || 224, height: vis.height || 52 };
    }

    // Helper: compile custom SVG layers
    function renderCustomSvg(layers, width, height) {
      const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      let svgContent = '';
      sorted.forEach(layer => {
        const { type, x, y, width: w, height: h, style, content } = layer;
        const opacity = style.opacity ?? 1;
        const fill = style.fill || 'transparent';
        const stroke = style.stroke || 'none';
        const strokeW = style.strokeWidth ?? 0;
        const rx = style.rx ?? 0;

        if (type === 'rectangle') {
          svgContent += \`<rect x="\${x}" y="\${y}" width="\${w}" height="\${h}" fill="\${fill}" stroke="\${stroke}" stroke-width="\${strokeW}" rx="\${rx}" opacity="\${opacity}" />\`;
        } else if (type === 'circle') {
          svgContent += \`<ellipse cx="\${x + w/2}" cy="\${y + h/2}" rx="\${w/2}" ry="\${h/2}" fill="\${fill}" stroke="\${stroke}" stroke-width="\${strokeW}" opacity="\${opacity}" />\`;
        } else if (type === 'text') {
          svgContent += \`<text x="\${x + w/2}" y="\${y + h/2}" text-anchor="middle" dominant-baseline="central" fill="\${fill}" stroke="\${stroke}" stroke-width="\${strokeW}" font-size="\${h * 0.7}" font-family="sans-serif" font-weight="bold" opacity="\${opacity}">\${content || ''}</text>\`;
        } else if (type === 'image') {
          svgContent += \`<image href="\${content || ''}" x="\${x}" y="\${y}" width="\${w}" height="\${h}" preserveAspectRatio="none" opacity="\${opacity}" />\`;
        }
      });
      return \`<svg width="100%" height="100%" viewBox="0 0 \${width} \${height}" xmlns="http://www.w3.org/2000/svg">\${svgContent}</svg>\`;
    }

    // Schedule Math Calculations (Recursive nesting tree with round-trip and section support)
    function calculateSchedules(logicalData, timelines) {
      const sortedSeqs = [...logicalData.sequences].sort((a, b) => a.stepNumber - b.stepNumber);
      const schedules = [];
      
      const edgeMap = {};
      logicalData.edges.forEach(e => { edgeMap[e.id] = e; });

      const nodeMap = {};
      (logicalData.nodes || []).forEach(n => { nodeMap[n.id] = n; });

      // Identify section nodes
      const sectionIds = {};
      (logicalData.nodes || []).forEach(n => { if (n.type === 'section') sectionIds[n.id] = true; });

      // Resolve source/target for each step
      const seqNodes = {};
      sortedSeqs.forEach(seq => {
        const edge = edgeMap[seq.edgeId];
        const src = edge ? (seq.direction === 'reverse' ? edge.targetId : edge.sourceId) : '';
        const tgt = edge ? (seq.direction === 'reverse' ? edge.sourceId : edge.targetId) : '';
        seqNodes[seq.id] = { src, tgt };
      });

      // Build nesting tree
      const childrenOf = {};
      const nested = {};
      const activeRTTargets = {};

      // Phase 1: RT nesting
      sortedSeqs.forEach(seq => {
        const src = seqNodes[seq.id].src;
        const parentId = src ? activeRTTargets[src] : undefined;

        if (parentId) {
          nested[seq.id] = true;
          if (!childrenOf[parentId]) childrenOf[parentId] = [];
          childrenOf[parentId].push(seq);
        }

        if (seq.isRoundTrip) {
          const tgt = seqNodes[seq.id].tgt;
          if (tgt) activeRTTargets[tgt] = seq.id;
        }
      });

      // Phase 2: Section nesting
      const sectionEntrySteps = {};
      sortedSeqs.forEach(seq => {
        const tgt = seqNodes[seq.id].tgt;
        if (tgt && sectionIds[tgt]) {
          sectionEntrySteps[tgt] = seq.id;
        }
      });

      sortedSeqs.forEach(seq => {
        if (nested[seq.id]) return;
        const edge = edgeMap[seq.edgeId];
        if (!edge) return;
        const fromNode = nodeMap[edge.sourceId];
        if (!fromNode) return;
        if (fromNode.parentId && sectionIds[fromNode.parentId]) {
          const parentStepId = sectionEntrySteps[fromNode.parentId];
          if (parentStepId && parentStepId !== seq.id) {
            nested[seq.id] = true;
            if (!childrenOf[parentStepId]) childrenOf[parentStepId] = [];
            childrenOf[parentStepId].push(seq);
          }
        }
      });

      // Recursive: process a step and its nested children
      function processStep(seq, startTime) {
        const tConf = timelines[seq.id] || { duration: 1000, delay: 0 };
        const duration = tConf.duration ?? 1000;
        const children = childrenOf[seq.id] || [];

        // Case 1: Simple step (no children, not round-trip)
        if (!seq.isRoundTrip && children.length === 0) {
          const internalProcess = tConf.internalProcess ? {
            text: tConf.internalProcess.text,
            start: startTime + duration,
            end: startTime + duration + (tConf.internalProcess.duration ?? 1000),
            duration: tConf.internalProcess.duration ?? 1000
          } : null;

          schedules.push({
            id: seq.id, stepNumber: seq.stepNumber, edgeId: seq.edgeId,
            direction: seq.direction || 'forward', isRoundTrip: false,
            isAsync: seq.isAsync || false, start: startTime,
            mainEnd: startTime + duration, end: startTime + duration,
            duration: duration, internalProcess: internalProcess
          });
          return startTime + duration;
        }

        // Case 2: Section-targeting step (has children, not round-trip)
        if (!seq.isRoundTrip && children.length > 0) {
          const arrivalTime = startTime + duration;
          const childGroups = {};
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
              const childTiming = timelines[child.id] || { duration: 1000, delay: 0 };
              const childDelay = childTiming.delay ?? 0;
              const childStart = snapshot + childDelay;
              const childEnd = processStep(child, childStart);
              if (!child.isAsync) {
                if (childEnd > childReadyTime) childReadyTime = childEnd;
                if (childEnd > latestSyncEnd) latestSyncEnd = childEnd;
              }
            });
          });

          schedules.push({
            id: seq.id, stepNumber: seq.stepNumber, edgeId: seq.edgeId,
            direction: seq.direction || 'forward', isRoundTrip: false,
            isAsync: seq.isAsync || false, start: startTime,
            mainEnd: startTime + duration, end: latestSyncEnd,
            duration: duration, internalProcess: null
          });
          return seq.isAsync ? arrivalTime : latestSyncEnd;
        }

        // Case 3: Round-trip
        const halfTransit = duration / 2;
        const forwardReach = startTime + halfTransit;
        const ipDur = tConf.internalProcess ? (tConf.internalProcess.duration ?? 1000) : 0;

        const childGroups = {};
        children.forEach(c => {
          if (!childGroups[c.stepNumber]) childGroups[c.stepNumber] = [];
          childGroups[c.stepNumber].push(c);
        });

        let childReadyTime = forwardReach;
        let latestSyncEnd = forwardReach;

        Object.keys(childGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
          const group = childGroups[gn];
          const snapshot = childReadyTime;

          group.forEach(child => {
            const childTiming = timelines[child.id] || { duration: 1000, delay: 0 };
            const childDelay = childTiming.delay ?? 0;
            const childStart = snapshot + childDelay;
            const childEnd = processStep(child, childStart);

            if (!child.isAsync) {
              if (childEnd > childReadyTime) childReadyTime = childEnd;
              if (childEnd > latestSyncEnd) latestSyncEnd = childEnd;
            }
          });
        });

        const returnStart = latestSyncEnd + ipDur;
        const totalEnd = returnStart + halfTransit;

        const internalProcess = tConf.internalProcess ? {
          text: tConf.internalProcess.text,
          start: latestSyncEnd,
          end: returnStart,
          duration: ipDur
        } : null;

        schedules.push({
          id: seq.id, stepNumber: seq.stepNumber, edgeId: seq.edgeId,
          direction: seq.direction || 'forward', isRoundTrip: true,
          isAsync: seq.isAsync || false, start: startTime,
          mainEnd: startTime + duration, end: totalEnd,
          duration: duration, internalProcess: internalProcess
        });
        return totalEnd;
      }

      // Process root-level steps grouped by stepNumber.
      //
      // SOURCE-CHAIN DEPENDENCY MODEL: each seq's start is derived from the
      // latest end of any seq that targeted its source node (direct predecessor).
      // Falls back to global floor when no source-chain predecessor exists.
      const rootSteps = sortedSeqs.filter(seq => !nested[seq.id]);
      const rootGroups = {};
      rootSteps.forEach(seq => {
        if (!rootGroups[seq.stepNumber]) rootGroups[seq.stepNumber] = [];
        rootGroups[seq.stepNumber].push(seq);
      });

      const nodeEndTime = {};  // nodeId -> latest end time of seqs targeting it
      let globalFloor = 0;

      Object.keys(rootGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
        const group = rootGroups[gn];
        let maxSyncEnd = globalFloor;

        group.forEach(seq => {
          const { src, tgt } = seqNodes[seq.id];
          const tConf = timelines[seq.id] || { duration: 1000, delay: 0 };
          const delay = tConf.delay ?? 0;

          // Primary: source-chain predecessor end. Fallback: global floor.
          const sourceChainEnd = nodeEndTime[src]; // undefined if no predecessor
          const baseStart = sourceChainEnd !== undefined ? sourceChainEnd : globalFloor;
          const startTime = baseStart + delay;

          const totalEnd = processStep(seq, startTime);

          if (!seq.isAsync && tgt) {
            nodeEndTime[tgt] = Math.max(nodeEndTime[tgt] || 0, totalEnd);
          }

          if (!seq.isAsync && totalEnd > maxSyncEnd) {
            maxSyncEnd = totalEnd;
          }
        });

        globalFloor = maxSyncEnd;
      });

      return schedules.sort((a, b) => a.start - b.start);
    }

    // Initialize DOM Layout
    const schedules = calculateSchedules(initialData.logicalData, initialData.visualData.timelines || {});
    maxDuration = schedules.length > 0 ? Math.max(...schedules.map(s => s.end)) + 500 : 2000;
    
    // Set Slider Limits
    document.getElementById('time-slider').max = maxDuration;
    document.getElementById('total-time-readout').textContent = (maxDuration / 1000).toFixed(2) + 's';

    // Renders the Canvas Nodes
    function renderNodes() {
      const nodesLayer = document.getElementById('nodes-layer');
      nodesLayer.innerHTML = '';
      
      const themeColorMap = {
        indigo: '#6366f1', emerald: '#10b981', rose: '#f43f5e',
        amber: '#f59e0b', violet: '#8b5cf6', cyan: '#06b6d4'
      };

      // Render sections first (they go behind regular nodes)
      initialData.logicalData.nodes.filter(n => n.type === 'section').forEach(node => {
        const visual = initialData.visualData.layoutNodes[node.id] || { x: 100, y: 100, width: 400, height: 300 };
        
        const section = document.createElement('div');
        section.id = 'node-card-' + node.id;
        section.className = 'section-card';
        section.style.left = visual.x + 'px';
        section.style.top = visual.y + 'px';
        section.style.width = (visual.width || 400) + 'px';
        section.style.height = (visual.height || 300) + 'px';
        section.style.zIndex = '-1';
        section.style.pointerEvents = 'auto';

        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = node.name;
        section.appendChild(label);

        // Tooltip slot for sections too
        const tooltipSlot = document.createElement('div');
        tooltipSlot.id = 'tooltip-slot-' + node.id;
        tooltipSlot.style.position = 'absolute';
        tooltipSlot.style.top = '0';
        tooltipSlot.style.left = '0';
        tooltipSlot.style.width = '100%';
        tooltipSlot.style.height = '100%';
        tooltipSlot.style.pointerEvents = 'none';
        section.appendChild(tooltipSlot);

        nodesLayer.appendChild(section);
      });

      // Render regular nodes (using absolute positions for child nodes)
      initialData.logicalData.nodes.filter(n => n.type !== 'section').forEach(node => {
        const absPos = getAbsolutePos(node.id);
        const visual = initialData.visualData.layoutNodes[node.id] || {};
        const customTemplate = initialData.libraryComponents.find(c => c.componentId === node.type);
        const displayMode = visual.displayMode || 'default';
        const rotation = visual.rotation || 0;
        const theme = visual.theme || 'indigo';
        const themeColor = themeColorMap[theme] || '#6366f1';
        
        const card = document.createElement('div');
        card.id = 'node-card-' + node.id;
        // Orientation: rotation===90 means vertical layout (flex-col + writing-mode)
        // No CSS transform — stored w/h IS the bounding box, exactly as in the canvas.
        const isVertical = rotation === 90;
        card.className = 'node-card'
          + (displayMode === 'icon-only' ? ' icon-only' : '')
          + (isVertical && displayMode !== 'icon-only' ? ' vertical' : '');
        card.style.left = absPos.x + 'px';
        card.style.top = absPos.y + 'px';
        card.style.width = absPos.width + 'px';
        card.style.height = absPos.height + 'px';
        if (displayMode !== 'icon-only') {
          card.style.borderColor = themeColor + '99'; // themed border with opacity
        }

        // Render standard card contents
        const iconDiv = document.createElement('div');
        iconDiv.className = 'node-icon-box';
        if (customTemplate) {
          iconDiv.innerHTML = renderCustomSvg(customTemplate.layers, customTemplate.dimensions.width, customTemplate.dimensions.height);
        } else {
          const iconSvg = iconsMap[node.type] || iconsMap.client;
          iconDiv.innerHTML = iconSvg;
          // Apply theme color to svg stroke
          const svgEl = iconDiv.querySelector('svg');
          if (svgEl) svgEl.style.color = themeColor;
        }

        card.appendChild(iconDiv);

        // Only show label in default mode
        if (displayMode !== 'icon-only') {
          const infoDiv = document.createElement('div');
          infoDiv.className = 'node-info';
          infoDiv.innerHTML = \`<div class="node-name">\${node.name}</div>
            <div class="node-type">\${customTemplate ? customTemplate.category : node.type}</div>\`;
          card.appendChild(infoDiv);
        }

        // Tooltip slot
        const tooltipSlot = document.createElement('div');
        tooltipSlot.id = 'tooltip-slot-' + node.id;
        tooltipSlot.style.position = 'absolute';
        tooltipSlot.style.top = '0';
        tooltipSlot.style.left = '0';
        tooltipSlot.style.width = '100%';
        tooltipSlot.style.height = '100%';
        tooltipSlot.style.pointerEvents = 'none';

        card.appendChild(tooltipSlot);

        // Render port dots (connection points)
        const handles = visual.handles || [
          { id: 'top:50', side: 'top', offset: 50 },
          { id: 'right:50', side: 'right', offset: 50 },
          { id: 'bottom:50', side: 'bottom', offset: 50 },
          { id: 'left:50', side: 'left', offset: 50 },
        ];
        handles.forEach(function(h) {
          var dot = document.createElement('div');
          dot.className = 'port-dot';
          if (h.side === 'top')    { dot.style.left = h.offset+'%'; dot.style.top = '0'; dot.style.transform = 'translate(-50%,-50%)'; }
          if (h.side === 'bottom') { dot.style.left = h.offset+'%'; dot.style.bottom = '0'; dot.style.top = 'auto'; dot.style.transform = 'translate(-50%,50%)'; }
          if (h.side === 'left')   { dot.style.top = h.offset+'%'; dot.style.left = '0'; dot.style.transform = 'translate(-50%,-50%)'; }
          if (h.side === 'right')  { dot.style.top = h.offset+'%'; dot.style.right = '0'; dot.style.left = 'auto'; dot.style.transform = 'translate(50%,-50%)'; }
          card.appendChild(dot);
        });

        nodesLayer.appendChild(card);
      });
    }

    // Draw Static Edge Connections
    function renderEdges() {
      const svg = document.getElementById('svg-edges');
      svg.innerHTML = '';

      initialData.logicalData.edges.forEach(edge => {
        const sourceCard = document.getElementById('node-card-' + edge.sourceId);
        const targetCard = document.getElementById('node-card-' + edge.targetId);
        if (!sourceCard || !targetCard) return;

        const pathData = calculateBezierPath(edge);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = 'edge-path-' + edge.id;
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'edge-path');
        svg.appendChild(path);

        // Render Step Badge on Edge Midpoint
        const edgeSeqs = initialData.logicalData.sequences
          .filter(seq => seq.edgeId === edge.id)
          .sort((a, b) => a.stepNumber - b.stepNumber);

        if (edgeSeqs.length > 0) {
          // Temporary path element to calculate midpoint length
          const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          tempPath.setAttribute('d', pathData);
          
          let midPt = { x: 0, y: 0 };
          try {
            const totalLen = tempPath.getTotalLength ? tempPath.getTotalLength() : 0;
            if (totalLen > 0 && tempPath.getPointAtLength) {
              midPt = tempPath.getPointAtLength(totalLen / 2);
            } else {
              throw new Error('Fallback coordinates');
            }
          } catch(e) {
            const sAbs = getAbsolutePos(edge.sourceId);
            const tAbs = getAbsolutePos(edge.targetId);
            if (sAbs && tAbs) {
              midPt = {
                x: (sAbs.x + tAbs.x) / 2 + 112,
                y: (sAbs.y + tAbs.y) / 2 + 26
              };
            }
          }

          const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          badgeGroup.setAttribute('class', 'edge-badge-group');
          badgeGroup.id = 'edge-badge-' + edge.id;

          const stepNums = edgeSeqs
            .map(s => s.stepNumber)
            .sort((a, b) => a - b)
            .filter((value, index, self) => self.indexOf(value) === index);
          const protocolText = edge.protocol ? '- [' + edge.protocol + ']' : '';
          const stepText = stepNums.length > 0 ? stepNums.join(',') + protocolText : '';
          const badgeW = Math.max(22, stepText.length * 6 + 12);
          const badgeH = 16;

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', midPt.x - badgeW / 2);
          rect.setAttribute('y', midPt.y - badgeH / 2);
          rect.setAttribute('width', badgeW);
          rect.setAttribute('height', badgeH);
          rect.setAttribute('rx', '8');
          rect.setAttribute('fill', '#1e293b');
          rect.setAttribute('stroke', '#475569');
          rect.setAttribute('stroke-width', '1.5');
          rect.style.transition = 'fill 0.2s, stroke 0.2s';

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', midPt.x);
          text.setAttribute('y', midPt.y + 1);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('fill', '#f1f5f9');
          text.setAttribute('font-size', '9px');
          text.setAttribute('font-family', 'monospace');
          text.setAttribute('font-weight', 'bold');
          text.textContent = stepText;

          badgeGroup.appendChild(rect);
          badgeGroup.appendChild(text);
          svg.appendChild(badgeGroup);
        }
      });
    }

    // Calculate Curved Parallel Bezier coordinates between ports (uses absolute positions for child nodes)
    function calculateBezierPath(edge) {
      const sourceId = edge.sourceId;
      const targetId = edge.targetId;
      const ve = initialData.visualData.layoutEdges[edge.id] || {};
      const rawSourcePort = ve.sourceHandle || 'right:50';
      const rawTargetPort = ve.targetHandle || 'left:50';

      // Parse port format: 'side:offset' or legacy 'side' (defaults to 50%)
      function parsePort(portId) {
        const parts = portId.split(':');
        return { side: parts[0], offset: parts.length > 1 ? Number(parts[1]) : 50 };
      }

      const sourcePort = parsePort(rawSourcePort);
      const targetPort = parsePort(rawTargetPort);

      const sAbs = getAbsolutePos(sourceId);
      const tAbs = getAbsolutePos(targetId);
      if (!sAbs || !tAbs) return '';

      const sW = sAbs.width;
      const sH = sAbs.height;
      const tW = tAbs.width;
      const tH = tAbs.height;

      // Source Port coordinate (uses offset percentage)
      let sX, sY;
      if (sourcePort.side === 'left') {
        sX = sAbs.x;
        sY = sAbs.y + sH * (sourcePort.offset / 100);
      } else if (sourcePort.side === 'right') {
        sX = sAbs.x + sW;
        sY = sAbs.y + sH * (sourcePort.offset / 100);
      } else if (sourcePort.side === 'top') {
        sX = sAbs.x + sW * (sourcePort.offset / 100);
        sY = sAbs.y;
      } else { // bottom
        sX = sAbs.x + sW * (sourcePort.offset / 100);
        sY = sAbs.y + sH;
      }

      // Target Port coordinate (uses offset percentage)
      let tX, tY;
      if (targetPort.side === 'left') {
        tX = tAbs.x;
        tY = tAbs.y + tH * (targetPort.offset / 100);
      } else if (targetPort.side === 'right') {
        tX = tAbs.x + tW;
        tY = tAbs.y + tH * (targetPort.offset / 100);
      } else if (targetPort.side === 'top') {
        tX = tAbs.x + tW * (targetPort.offset / 100);
        tY = tAbs.y;
      } else { // bottom
        tX = tAbs.x + tW * (targetPort.offset / 100);
        tY = tAbs.y + tH;
      }

      // Find all parallel edges between the same two nodes (order-independent)
      const siblings = initialData.logicalData.edges.filter(
        e => (e.sourceId === edge.sourceId && e.targetId === edge.targetId) || (e.sourceId === edge.targetId && e.targetId === edge.sourceId)
      ).sort((a, b) => {
        const aSeqs = initialData.logicalData.sequences.filter(s => s.edgeId === a.id);
        const bSeqs = initialData.logicalData.sequences.filter(s => s.edgeId === b.id);
        const aMinStep = aSeqs.length > 0 ? Math.min(...aSeqs.map(s => s.stepNumber)) : 999;
        const bMinStep = bSeqs.length > 0 ? Math.min(...bSeqs.map(s => s.stepNumber)) : 999;
        if (aMinStep !== bMinStep) return aMinStep - bMinStep;
        return a.id.localeCompare(b.id);
      });

      const total = siblings.length;
      const index = siblings.findIndex(e => e.id === edge.id);

      let offset = 0;
      if (total > 1 && index >= 0) {
        const step = 30;
        const start = -((total - 1) * step) / 2;
        offset = start + index * step;
      }

      // Negate offset if from node ID is lexicographically greater than to node ID to align vectors physically
      if (edge.sourceId > edge.targetId) {
        offset = -offset;
      }

      const dx = tX - sX;
      const dy = tY - sY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      // Perpendicular unit vector
      const nx = -dy / len;
      const ny = dx / len;

      const controlOffset = Math.max(30, len * 0.3);

      let c1x = sX;
      let c1y = sY;
      let c2x = tX;
      let c2y = tY;

      if (sourcePort.side === 'left') c1x -= controlOffset;
      else if (sourcePort.side === 'right') c1x += controlOffset;
      else if (sourcePort.side === 'top') c1y -= controlOffset;
      else if (sourcePort.side === 'bottom') c1y += controlOffset;

      if (targetPort.side === 'left') c2x -= controlOffset;
      else if (targetPort.side === 'right') c2x += controlOffset;
      else if (targetPort.side === 'top') c2y -= controlOffset;
      else if (targetPort.side === 'bottom') c2y += controlOffset;

      c1x += nx * offset;
      c1y += ny * offset;
      c2x += nx * offset;
      c2y += ny * offset;

      return 'M ' + sX + ',' + sY + ' C ' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + tX + ',' + tY;
    }

    // Renders list of steps in the sidebar
    function renderStepsList() {
      const container = document.getElementById('steps-list');
      container.innerHTML = '';

      schedules.forEach(s => {
        const seq = initialData.logicalData.sequences.find(q => q.id === s.id);
        const edge = initialData.logicalData.edges.find(e => e.id === seq.edgeId);
        if (!edge) return;

        const srcNode = initialData.logicalData.nodes.find(n => n.id === edge.sourceId);
        const dstNode = initialData.logicalData.nodes.find(n => n.id === edge.targetId);
        const srcName = srcNode ? srcNode.name : edge.sourceId;
        const dstName = dstNode ? dstNode.name : edge.targetId;

        const item = document.createElement('div');
        item.id = 'step-item-' + s.id;
        item.className = 'step-item';
        
        const descHtml = edge.description ? \`<div class="step-description">↳ \${edge.description}</div>\` : '';
        item.innerHTML = \`<div class="step-header">
            <span class="step-order">Step \${s.stepNumber}</span>
            <span style="font-size: 9px; font-weight:600; color:#64748b;">\${(s.start/1000).toFixed(1)}s - \${(s.end/1000).toFixed(1)}s</span>
          </div>
          <div class="step-label">\${seq.protocol || 'JSON'} Call</div>
          <div class="step-flow">\${srcName} → \${dstName}</div>
          \${descHtml}\`;

        // Click to jump playhead to the start of this step
        item.addEventListener('click', () => {
          currentTime = s.start;
          isPlaying = false;
          const btn = document.getElementById('btn-play');
          const icon = document.getElementById('play-icon');
          if (btn && icon) {
            btn.title = 'Play';
            icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
          }
          updateSimulation(currentTime);
        });

        container.appendChild(item);
      });
    }

    // Main animation loop runner
    function updateSimulation(time) {
      // 1. Update sliders
      document.getElementById('time-slider').value = time;
      document.getElementById('current-time-readout').textContent = (time / 1000).toFixed(2) + 's';

      // 2. Clear previous active classes
      const svg = document.getElementById('svg-edges');
      // remove old particles
      const particles = svg.querySelectorAll('.sim-particle');
      particles.forEach(p => p.remove());

      // Reset node cards borders & tooltips
      initialData.logicalData.nodes.forEach(n => {
        const card = document.getElementById('node-card-' + n.id);
        if (card) {
          card.classList.remove('processing');
          card.classList.remove('node-active');
        }
        const tooltipSlot = document.getElementById('tooltip-slot-' + n.id);
        if (tooltipSlot) tooltipSlot.innerHTML = '';
      });

      // Reset step highlights, active edges, and edge badges
      schedules.forEach(s => {
        const el = document.getElementById('step-item-' + s.id);
        if (el) el.classList.remove('active');

        const seq = initialData.logicalData.sequences.find(q => q.id === s.id);
        if (seq) {
          const pathEl = document.getElementById('edge-path-' + seq.edgeId);
          if (pathEl) pathEl.classList.remove('edge-path-active');
          const badgeEl = document.getElementById('edge-badge-' + seq.edgeId);
          if (badgeEl) {
            const rect = badgeEl.querySelector('rect');
            if (rect) {
              rect.setAttribute('fill', '#1e293b');
              rect.setAttribute('stroke', '#475569');
            }
          }
        }
      });

      // 3. Trace active schedules
      let stepToScroll = null;
      schedules.forEach(s => {
        if (time >= s.start && time <= s.end) {
          // Highlight sequence step list
          const stepItem = document.getElementById('step-item-' + s.id);
          if (stepItem) {
            stepItem.classList.add('active');
            stepToScroll = stepItem;
          }

          const seq = initialData.logicalData.sequences.find(q => q.id === s.id);
          const edge = initialData.logicalData.edges.find(e => e.id === seq.edgeId);
          if (!edge) return;

          // Highlight edge line and step badge
          const pathEl = document.getElementById('edge-path-' + edge.id);
          if (pathEl) pathEl.classList.add('edge-path-active');
          const badgeEl = document.getElementById('edge-badge-' + edge.id);
          if (badgeEl) {
            const rect = badgeEl.querySelector('rect');
            if (rect) {
              rect.setAttribute('fill', '#6366f1');
              rect.setAttribute('stroke', '#818cf8');
            }
          }
          
          // Draw particle running along the path (supports round trip return calls)
          const elapsed = time - s.start;
          let actualProgress = 0;
          let showParticle = false;

          if (s.isRoundTrip) {
            const transitHalf = s.duration / 2;
            const returnStartElapsed = (s.end - s.start) - transitHalf;
            
            if (elapsed < transitHalf) {
              actualProgress = Math.min(Math.max(elapsed / transitHalf, 0), 1);
              showParticle = true;
            } else if (elapsed < returnStartElapsed) {
              actualProgress = 1.0;
              showParticle = true;
            } else {
              const returnElapsed = elapsed - returnStartElapsed;
              actualProgress = 1.0 - Math.min(Math.max(returnElapsed / transitHalf, 0), 1);
              showParticle = true;
            }
          } else {
            // Non-round-trip: particle travels over edge transit duration only
            // (s.end - s.start may include subflow children time for section-targeting edges)
            const transitDuration = s.duration;
            if (elapsed < transitDuration) {
              actualProgress = Math.min(Math.max(elapsed / transitDuration, 0), 1);
            } else {
              // Particle arrived — hold at destination
              actualProgress = 1.0;
            }
            showParticle = true;
          }

          if (showParticle && pathEl) {
            const pathLen = pathEl.getTotalLength();
            let pointProgress = seq.direction === 'reverse' ? (1 - actualProgress) : actualProgress;
            
            // Check if getPointAtLength is supported
            if (pathEl.getPointAtLength) {
              const pt = pathEl.getPointAtLength(pointProgress * pathLen);
              const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              group.setAttribute('class', 'sim-particle');
              group.setAttribute('style', 'pointer-events: none;');

              // Glow ring
              const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              glow.setAttribute('cx', pt.x);
              glow.setAttribute('cy', pt.y);
              glow.setAttribute('r', '16');
              glow.setAttribute('fill', '#818cf8');
              glow.setAttribute('opacity', '0.3');
              group.appendChild(glow);

              // Main billiard ball body
              const ball = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              ball.setAttribute('cx', pt.x);
              ball.setAttribute('cy', pt.y);
              ball.setAttribute('r', '11');
              ball.setAttribute('fill', '#4f46e5');
              group.appendChild(ball);

              // White center stripe/circle
              const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              center.setAttribute('cx', pt.x);
              center.setAttribute('cy', pt.y);
              center.setAttribute('r', '6.5');
              center.setAttribute('fill', '#ffffff');
              group.appendChild(center);

              // Step Number Text
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', pt.x);
              text.setAttribute('y', pt.y);
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('dominant-baseline', 'central');
              text.setAttribute('fill', '#1e293b');
              text.setAttribute('style', 'font-size: 8.5px; font-weight: 900; font-family: sans-serif; user-select: none;');
              text.textContent = seq.stepNumber;
              group.appendChild(text);

              svg.appendChild(group);
            }
          }

          // Trigger internal process tooltip
          if (s.internalProcess && time >= s.internalProcess.start && time <= s.internalProcess.end) {
            const targetNodeId = s.direction === 'reverse' ? edge.sourceId : edge.targetId;
            const card = document.getElementById('node-card-' + targetNodeId);
            if (card) card.classList.add('processing');

            const tooltipSlot = document.getElementById('tooltip-slot-' + targetNodeId);
            if (tooltipSlot && !tooltipSlot.querySelector('.node-tooltip')) {
              const tip = document.createElement('div');
              tip.className = 'node-tooltip';
              tip.innerHTML = '<span>' + s.internalProcess.text + '</span><div class="node-tooltip-arrow"></div>';
              tooltipSlot.appendChild(tip);
            }
          }

          // Activate section processing glow when particle has arrived at a section
          const targetNodeId2 = s.direction === 'reverse' ? edge.sourceId : edge.targetId;
          const targetNode = initialData.logicalData.nodes.find(n => n.id === targetNodeId2);
          if (targetNode && targetNode.type === 'section') {
            const transitDone = s.isRoundTrip ? (elapsed >= s.duration / 2) : (elapsed >= s.duration);
            if (transitDone) {
              const sectionCard = document.getElementById('node-card-' + targetNodeId2);
              if (sectionCard) sectionCard.classList.add('processing');
            }
          }

          // Node highlighting: light up nodes when the 'ball' is at them
          const srcNodeId = s.direction === 'reverse' ? edge.targetId : edge.sourceId;
          const tgtNodeId = s.direction === 'reverse' ? edge.sourceId : edge.targetId;

          if (s.isRoundTrip) {
            const halfT = s.duration / 2;
            const totalEl = s.end - s.start;
            const returnEl = totalEl - halfT;

            // Source: forward transit & return transit
            if (elapsed < halfT || elapsed >= returnEl) {
              const sc = document.getElementById('node-card-' + srcNodeId);
              if (sc) sc.classList.add('node-active');
            }
            // Target: from arrival to return start
            if (elapsed >= halfT && elapsed < returnEl) {
              const tc = document.getElementById('node-card-' + tgtNodeId);
              if (tc) tc.classList.add('node-active');
            }
          } else {
            const transit = s.duration;
            // Source: during forward transit
            if (elapsed < transit) {
              const sc = document.getElementById('node-card-' + srcNodeId);
              if (sc) sc.classList.add('node-active');
            }
            // Target: from arrival until schedule ends
            if (elapsed >= transit) {
              const tc = document.getElementById('node-card-' + tgtNodeId);
              if (tc) tc.classList.add('node-active');
            }
          }
        }
      });

      // Smooth scroll the active step item into view inside the list panel
      if (stepToScroll) {
        stepToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Playback Animation Loop
    function tick(timestamp) {
      if (!isPlaying) return;
      if (!lastTick) lastTick = timestamp;

      const delta = timestamp - lastTick;
      lastTick = timestamp;

      currentTime += delta * playbackRate;
      if (currentTime >= maxDuration) {
        currentTime = 0;
      }

      updateSimulation(currentTime);
      requestAnimationFrame(tick);
    }

    // Event Listeners
    document.getElementById('btn-play').addEventListener('click', () => {
      isPlaying = !isPlaying;
      const btn = document.getElementById('btn-play');
      const icon = document.getElementById('play-icon');

      if (isPlaying) {
        btn.title = 'Pause';
        icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        lastTick = null;
        requestAnimationFrame(tick);
      } else {
        btn.title = 'Play';
        icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
    });

    document.getElementById('btn-stop').addEventListener('click', () => {
      isPlaying = false;
      currentTime = 0;
      lastTick = null;
      
      const btn = document.getElementById('btn-play');
      const icon = document.getElementById('play-icon');
      btn.title = 'Play';
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      
      updateSimulation(0);
    });

    document.getElementById('time-slider').addEventListener('input', (e) => {
      currentTime = Number(e.target.value);
      updateSimulation(currentTime);
    });

    document.getElementById('speed-multiplier').addEventListener('change', (e) => {
      playbackRate = parseFloat(e.target.value);
    });

    // Fit diagrams view layout size viewport
    function adjustViewZoom() {
      const container = document.getElementById('canvas-container');
      const nodes = initialData.logicalData.nodes;
      if (nodes.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      nodes.forEach(n => {
        const absPos = getAbsolutePos(n.id);
        minX = Math.min(minX, absPos.x);
        minY = Math.min(minY, absPos.y);
        maxX = Math.max(maxX, absPos.x + absPos.width);
        maxY = Math.max(maxY, absPos.y + absPos.height);
      });

      const width = maxX - minX + 200;
      const height = maxY - minY + 200;

      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      zoomScale = Math.min(containerW / width, containerH / height, 1.0);
      panX = (containerW - width * zoomScale) / 2 - minX * zoomScale + 100 * zoomScale;
      panY = (containerH - height * zoomScale) / 2 - minY * zoomScale + 100 * zoomScale;

      updateCanvasTransform();
    }

    function updateCanvasTransform() {
      const canvas = document.getElementById('canvas');
      canvas.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomScale + ')';
    }

    // Mouse Drag Panning
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    const canvasContainer = document.getElementById('canvas-container');

    canvasContainer.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 1) {
        if (e.target.closest('.node-card')) return;
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateCanvasTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Mouse Wheel Zooming
    canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomIntensity = 0.05;
      const rect = canvasContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - panX) / zoomScale;
      const canvasY = (mouseY - panY) / zoomScale;

      const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
      const newScale = Math.max(0.15, Math.min(4.0, zoomScale * zoomFactor));

      panX = mouseX - canvasX * newScale;
      panY = mouseY - canvasY * newScale;
      zoomScale = newScale;

      updateCanvasTransform();
    }, { passive: false });

    // Zoom Button Listeners
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      const rect = canvasContainer.getBoundingClientRect();
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const canvasX = (midX - panX) / zoomScale;
      const canvasY = (midY - panY) / zoomScale;

      zoomScale = Math.min(4.0, zoomScale * 1.2);
      panX = midX - canvasX * zoomScale;
      panY = midY - canvasY * zoomScale;
      updateCanvasTransform();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      const rect = canvasContainer.getBoundingClientRect();
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const canvasX = (midX - panX) / zoomScale;
      const canvasY = (midY - panY) / zoomScale;

      zoomScale = Math.max(0.15, zoomScale / 1.2);
      panX = midX - canvasX * zoomScale;
      panY = midY - canvasY * zoomScale;
      updateCanvasTransform();
    });

    document.getElementById('btn-zoom-fit').addEventListener('click', () => {
      adjustViewZoom();
    });

    // Startup Init
    window.addEventListener('resize', adjustViewZoom);
    document.getElementById('diag-name').textContent = initialData.logicalData.name || 'Standalone System Diagram';

    // Theme toggle
    const moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const sunSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const html = document.documentElement;
      html.classList.toggle('light');
      html.classList.toggle('dark');
      const isDark = html.classList.contains('dark');
      document.getElementById('theme-toggle').innerHTML = isDark ? moonSvg : sunSvg;
    });

    renderNodes();
    renderEdges();
    renderStepsList();
    adjustViewZoom();
    updateSimulation(0);

  </script>
</body>
</html>
`;
};
