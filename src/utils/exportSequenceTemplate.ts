import { LogicalDiagram } from '../types';
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
} from '../components/sequence/sequenceLayoutUtils';

export const generateSequenceHtml = (
  logicalData: LogicalDiagram,
  schedules: Record<string, { start: number; end: number }>,
  timelines: Record<string, any>,
  theme: 'light' | 'dark'
): string => {
  const participants = logicalData.nodes.filter(n => n.type !== 'section');
  const sections = logicalData.nodes.filter(n => n.type === 'section');
  
  const participantOrder = computeParticipantOrder(participants, logicalData.edges);
  const edgeMap = new Map(logicalData.edges.map((e) => [e.id, e]));
  const { fwdSlotMap, retSlotMap, totalSlots } = computeSlots(logicalData.sequences, schedules);
  
  const fragmentBounds = computeFragmentBounds(
    sections, participants, participantOrder, edgeMap,
    logicalData.sequences, fwdSlotMap, retSlotMap
  );

  const orderObj = Object.fromEntries(participantOrder);
  const fwdSlotObj = Object.fromEntries(fwdSlotMap);
  const retSlotObj = Object.fromEntries(retSlotMap);

  const logicalJson = JSON.stringify(logicalData);
  const schedulesJson = JSON.stringify(schedules);
  const timelinesJson = JSON.stringify(timelines || {});
  const layoutJson = JSON.stringify({
    orderObj, fwdSlotObj, retSlotObj, totalSlots, fragmentBounds,
    constants: {
      PARTICIPANT_SPACING, HEADER_HEIGHT, MESSAGE_ROW_HEIGHT, TOP_PADDING,
      LIFELINE_START_Y, PARTICIPANT_WIDTH, FRAGMENT_PADDING_X, FRAGMENT_PADDING_Y
    }
  });

  const isDark = theme === 'dark';
  
  const maxParticipantCol = Math.max(...Array.from(participantOrder.values()), 0);
  const totalWidth = (maxParticipantCol * PARTICIPANT_SPACING) + PARTICIPANT_WIDTH + 100;
  const totalHeight = LIFELINE_START_Y + ((totalSlots + 2) * MESSAGE_ROW_HEIGHT);

  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <title>Sequence Diagram Simulation</title>
  <style>
    :root, html.dark {
      --bg-body: #020617;
      --bg-surface: #0f172a;
      --bg-canvas: #0b0f19;
      --bg-canvas-dot: #1e293b;
      --color-text: #f8fafc;
      --color-text-muted: #64748b;
      --color-border: #1e293b;
      
      --header-bg: #1e293b;
      --header-border: #334155;
      --lifeline-color: #334155;
      --arrow-color: #94a3b8;
      --active-color: #38bdf8;
      --bg-panel: rgba(15, 23, 42, 0.9);
      --bg-zoom-btn: rgba(15, 23, 42, 0.85);
    }
    html.light {
      --bg-body: #f8fafc;
      --bg-surface: #ffffff;
      --bg-canvas: #f1f5f9;
      --bg-canvas-dot: #cbd5e1;
      --color-text: #0f172a;
      --color-text-muted: #64748b;
      --color-border: #e2e8f0;
      
      --header-bg: #ffffff;
      --header-border: #cbd5e1;
      --lifeline-color: #cbd5e1;
      --arrow-color: #64748b;
      --active-color: #0ea5e9;
      --bg-panel: rgba(255, 255, 255, 0.92);
      --bg-zoom-btn: rgba(255, 255, 255, 0.9);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background-color: var(--bg-body);
      color: var(--color-text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
    }

    /* Top Controls (Theme) */
    .top-controls {
      position: absolute;
      top: 24px;
      left: 24px;
      z-index: 50;
    }
    .control-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background-color: var(--bg-zoom-btn);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }
    .control-btn:hover { background-color: var(--active-color); color: #fff; }

    /* Zoom Controls */
    .zoom-controls {
      position: absolute;
      bottom: 24px;
      left: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 50;
    }
    .zoom-controls button {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background-color: var(--bg-zoom-btn);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zoom-controls button:hover { background-color: var(--active-color); color: #fff; }

    /* Flow Logs Sidebar */
    #flow-logs {
      position: absolute;
      right: 24px;
      top: 24px;
      bottom: 100px;
      width: 320px;
      background-color: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      z-index: 40;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    #flow-logs h3 {
      padding: 16px;
      margin: 0;
      font-size: 14px;
      border-bottom: 1px solid var(--color-border);
    }
    #flow-logs-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .log-item {
      padding: 10px 12px;
      border-radius: 8px;
      background-color: var(--bg-surface);
      border: 1px solid var(--color-border);
      display: flex;
      gap: 12px;
      align-items: center;
      transition: all 0.2s;
    }
    .log-item.active {
      border-color: var(--active-color);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
    }
    .log-item.active .log-time {
      background-color: var(--active-color);
      color: #fff;
    }
    .log-time {
      background-color: var(--color-border);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      transition: all 0.2s;
    }
    .log-detail {
      font-size: 12px;
      flex: 1;
    }

    /* Canvas Area */
    #canvas-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background-color: var(--bg-canvas);
      background-image: radial-gradient(var(--bg-canvas-dot) 1px, transparent 1px);
      background-size: 20px 20px;
      cursor: grab;
    }
    #canvas-container:active { cursor: grabbing; }

    #diagram-container {
      position: absolute;
      top: 0; left: 0;
      width: ${totalWidth}px;
      height: ${totalHeight}px;
      transform-origin: 0 0;
    }

    /* Sequence Diagram Elements */
    .participant {
      position: absolute;
      width: ${PARTICIPANT_WIDTH}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.3s ease;
    }
    .participant-header {
      width: 100%;
      height: ${HEADER_HEIGHT}px;
      background-color: var(--header-bg);
      border: 1px solid var(--header-border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }
    .participant.active .participant-header {
      border-color: var(--active-color);
      box-shadow: 0 0 10px var(--active-color);
    }
    .lifeline {
      position: absolute;
      top: ${HEADER_HEIGHT}px;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: repeating-linear-gradient(
        to bottom,
        var(--lifeline-color) 0,
        var(--lifeline-color) 8px,
        transparent 8px,
        transparent 16px
      );
      transform: translateX(-50%);
      z-index: 1;
    }
    .participant.active .lifeline {
      background: repeating-linear-gradient(
        to bottom,
        var(--active-color) 0,
        var(--active-color) 8px,
        transparent 8px,
        transparent 16px
      );
    }
    .activity-box {
      position: absolute;
      left: 50%;
      width: 14px;
      transform: translateX(-50%);
      background-color: var(--header-bg);
      border: 2px solid var(--lifeline-color);
      border-radius: 2px;
      z-index: 5;
      transition: all 0.3s ease;
    }
    .activity-box.active {
      border-color: var(--active-color);
      background-color: var(--active-color);
      opacity: 0.2;
    }
    .fragment {
      position: absolute;
      border: 2px dashed var(--header-border);
      border-radius: 8px;
      background-color: var(--header-bg);
      opacity: 0.4;
      z-index: 0;
    }
    .fragment-title {
      position: absolute;
      top: 0; left: 0;
      padding: 4px 12px;
      background-color: var(--header-bg);
      border-bottom: 2px dashed var(--header-border);
      border-right: 2px dashed var(--header-border);
      border-radius: 6px 0 6px 0;
      font-size: 12px;
      font-weight: 600;
      opacity: 1 !important;
    }
    svg {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 20;
    }
    .message-line {
      stroke: var(--arrow-color);
      stroke-width: 2;
      fill: none;
      transition: stroke 0.3s ease;
    }
    .message-line.active { stroke: var(--active-color); }
    .message-arrow { fill: var(--arrow-color); transition: fill 0.3s ease; }
    .message-line.active ~ .message-arrow { fill: var(--active-color); }
    .message-arrow-open { transition: stroke 0.3s ease; }
    .message-line.active ~ .message-arrow-open { stroke: var(--active-color); }
    
    .particle {
      fill: var(--active-color);
      filter: drop-shadow(0 0 4px var(--active-color));
    }
    .message-label {
      font-size: 12px;
      fill: var(--color-text);
      text-anchor: middle;
      font-family: monospace;
    }

    /* Player Controls */
    #controls {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--color-border);
      border-radius: 24px;
      padding: 12px 24px;
      display: flex;
      gap: 16px;
      align-items: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      z-index: 100;
    }
    #play-btn {
      background: var(--active-color);
      border: none;
      color: white;
      border-radius: 50%;
      width: 36px; height: 36px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    input[type=range] { width: 300px; accent-color: var(--active-color); }
    #time-display { font-size: 13px; font-weight: bold; width: 40px; color: var(--color-text); }
  </style>
</head>
<body>
  
  <div class="top-controls">
    <button id="theme-toggle" class="control-btn" title="Toggle Theme">
      ${isDark ? '☀️' : '🌙'}
    </button>
  </div>

  <div class="zoom-controls">
    <button id="zoom-in" title="Zoom In">+</button>
    <button id="zoom-out" title="Zoom Out">−</button>
    <button id="zoom-fit" title="Fit View">⛶</button>
  </div>

  <div id="flow-logs">
    <h3>Interaction Flow</h3>
    <div id="flow-logs-content"></div>
  </div>

  <div id="canvas-container">
    <div id="diagram-container">
      <div id="html-layer"></div>
      <svg id="svg-layer">
        <defs>
          <marker id="arrow-sync" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 12 6 L 0 12 z" class="message-arrow" />
          </marker>
          <marker id="arrow-async" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 6 L 0 11" fill="none" stroke="var(--arrow-color)" stroke-width="1.5" class="message-arrow-open" />
          </marker>
        </defs>
      </svg>
    </div>
  </div>
  
  <div id="controls">
    <button id="play-btn">▶</button>
    <input type="range" id="timeline" min="0" max="1000" value="0">
    <span id="time-display">0.0s</span>
  </div>

  <script>
    const logicalData = ${logicalJson};
    const schedules = ${schedulesJson};
    const timelines = ${timelinesJson};
    const layout = ${layoutJson};
    const C = layout.constants;

    const htmlLayer = document.getElementById('html-layer');
    const svgLayer = document.getElementById('svg-layer');
    const flowLogsContent = document.getElementById('flow-logs-content');

    // 1. Build Flow Logs
    const sortedSeqs = [...logicalData.sequences].sort((a, b) => a.stepNumber - b.stepNumber);
    sortedSeqs.forEach(seq => {
      const edge = logicalData.edges.find(e => e.id === seq.edgeId);
      if (!edge) return;
      const s = schedules[seq.id];
      if (!s) return;
      
      const logItem = document.createElement('div');
      logItem.className = 'log-item';
      logItem.id = 'log-item-' + seq.id;
      
      const timeStr = (s.start / 1000).toFixed(1) + 's';
      
      logItem.innerHTML = \`<div class="log-time">\${timeStr}</div>
      <div class="log-detail">
        <strong>\${seq.stepNumber}. \${seq.protocol || 'Message'}</strong><br/>
        <span style="font-size:11px; opacity:0.8">\${edge.sourceId} → \${edge.targetId}</span>
      </div>\`;
      flowLogsContent.appendChild(logItem);
    });

    // 2. Draw Fragments
    layout.fragmentBounds.forEach(fb => {
      const x = fb.minCol * C.PARTICIPANT_SPACING - C.FRAGMENT_PADDING_X;
      const y = C.HEADER_HEIGHT + fb.minSlot * C.MESSAGE_ROW_HEIGHT - C.FRAGMENT_PADDING_Y;
      const w = (fb.maxCol - fb.minCol) * C.PARTICIPANT_SPACING + C.PARTICIPANT_WIDTH + C.FRAGMENT_PADDING_X * 2;
      const h = (fb.maxSlot - fb.minSlot + 1) * C.MESSAGE_ROW_HEIGHT + C.FRAGMENT_PADDING_Y * 2;
      
      const el = document.createElement('div');
      el.className = 'fragment';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = w + 'px';
      el.style.height = h + 'px';

      const title = document.createElement('div');
      title.className = 'fragment-title';
      title.textContent = fb.sectionNode.name || 'Section';
      el.appendChild(title);

      htmlLayer.appendChild(el);
    });

    // 3. Pre-calculate activities for each participant
    const participantActivities = {};
    logicalData.nodes.filter(n => n.type !== 'section').forEach(p => {
      participantActivities[p.id] = [];
    });

    logicalData.sequences.forEach(seq => {
      const edge = logicalData.edges.find(e => e.id === seq.edgeId);
      if (!edge) return;
      const fwdSlot = layout.fwdSlotObj[seq.id];
      const retSlot = layout.retSlotObj[seq.id];
      const sched = schedules[seq.id];
      if (!sched) return;

      if (participantActivities[edge.targetId]) {
        participantActivities[edge.targetId].push({
          startSlot: fwdSlot,
          endSlot: retSlot !== undefined ? retSlot : fwdSlot,
          startTime: sched.start,
          endTime: sched.end
        });
      }
      if (participantActivities[edge.sourceId]) {
         participantActivities[edge.sourceId].push({
          startSlot: fwdSlot,
          endSlot: retSlot !== undefined ? retSlot : fwdSlot,
          startTime: sched.start,
          endTime: sched.end
        });
      }
    });

    // 4. Draw Participants and Activity Boxes
    const participantEls = {};
    const activityEls = [];

    logicalData.nodes.filter(n => n.type !== 'section').forEach(p => {
      const col = layout.orderObj[p.id];
      const x = col * C.PARTICIPANT_SPACING;
      const y = C.TOP_PADDING;

      const pEl = document.createElement('div');
      pEl.className = 'participant';
      pEl.style.left = x + 'px';
      pEl.style.top = y + 'px';
      pEl.style.height = (C.LIFELINE_START_Y + (layout.totalSlots + 1) * C.MESSAGE_ROW_HEIGHT) + 'px';

      const header = document.createElement('div');
      header.className = 'participant-header';
      header.innerHTML = \`<div style="font-weight:600">\${p.name}</div><div style="font-size:12px;opacity:0.7">\${p.type}</div>\`;
      
      const lifeline = document.createElement('div');
      lifeline.className = 'lifeline';

      pEl.appendChild(header);
      pEl.appendChild(lifeline);

      const acts = participantActivities[p.id];
      acts.forEach(act => {
        const box = document.createElement('div');
        box.className = 'activity-box';
        const topY = C.HEADER_HEIGHT + (act.startSlot + 0.25) * C.MESSAGE_ROW_HEIGHT;
        const bottomY = C.HEADER_HEIGHT + (act.endSlot + 0.75) * C.MESSAGE_ROW_HEIGHT;
        const boxHeight = bottomY - topY;
        box.style.top = topY + 'px';
        box.style.height = boxHeight + 'px';
        pEl.appendChild(box);
        
        activityEls.push({
          el: box,
          startTime: act.startTime,
          endTime: act.endTime
        });
      });

      htmlLayer.appendChild(pEl);
      participantEls[p.id] = pEl;
    });

    // 5. Draw Messages
    const messageEls = [];
    
    logicalData.sequences.forEach(seq => {
      const edge = logicalData.edges.find(e => e.id === seq.edgeId);
      if (!edge) return;
      const sourceCol = layout.orderObj[edge.sourceId];
      const targetCol = layout.orderObj[edge.targetId];
      if (sourceCol === undefined || targetCol === undefined) return;

      const startX = sourceCol * C.PARTICIPANT_SPACING + C.PARTICIPANT_WIDTH / 2;
      const endX = targetCol * C.PARTICIPANT_SPACING + C.PARTICIPANT_WIDTH / 2;
      const isRightToLeft = startX > endX;
      
      const fwdSlot = layout.fwdSlotObj[seq.id];
      const retSlot = layout.retSlotObj[seq.id];
      const sched = schedules[seq.id];
      if (!sched) return;

      const adjStartX = isRightToLeft ? startX - 7 : startX + 7;
      const adjEndX = isRightToLeft ? endX + 7 : endX - 7;

      const fwdY = C.LIFELINE_START_Y + (fwdSlot + 0.5) * C.MESSAGE_ROW_HEIGHT;
      const fwdLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      fwdLine.setAttribute('x1', adjStartX);
      fwdLine.setAttribute('y1', fwdY);
      fwdLine.setAttribute('x2', adjEndX);
      fwdLine.setAttribute('y2', fwdY);
      fwdLine.setAttribute('class', 'message-line');
      fwdLine.setAttribute('marker-end', seq.isAsync ? 'url(#arrow-async)' : 'url(#arrow-sync)');
      if (seq.isAsync) fwdLine.setAttribute('stroke-dasharray', '5,5');
      svgLayer.appendChild(fwdLine);

      const fwdLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      fwdLabel.setAttribute('x', (adjStartX + adjEndX) / 2);
      fwdLabel.setAttribute('y', fwdY - 8);
      fwdLabel.setAttribute('class', 'message-label');
      fwdLabel.textContent = \`[\${seq.stepNumber}] \${seq.protocol || ''}\`;
      svgLayer.appendChild(fwdLabel);

      const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      particle.setAttribute('r', '4');
      particle.setAttribute('class', 'particle');
      particle.style.display = 'none';
      svgLayer.appendChild(particle);

      let retLine, retLabel, retY = 0;
      if (seq.isRoundTrip && retSlot !== undefined) {
        retY = C.LIFELINE_START_Y + (retSlot + 0.5) * C.MESSAGE_ROW_HEIGHT;
        retLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        retLine.setAttribute('x1', adjEndX);
        retLine.setAttribute('y1', retY);
        retLine.setAttribute('x2', adjStartX);
        retLine.setAttribute('y2', retY);
        retLine.setAttribute('class', 'message-line');
        retLine.setAttribute('stroke-dasharray', '5,5');
        retLine.setAttribute('marker-end', 'url(#arrow-async)');
        svgLayer.appendChild(retLine);

        retLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        retLabel.setAttribute('x', (adjStartX + adjEndX) / 2);
        retLabel.setAttribute('y', retY - 8);
        retLabel.setAttribute('class', 'message-label');
        retLabel.textContent = seq.description || 'return';
        svgLayer.appendChild(retLabel);
      }

      messageEls.push({
        seqId: seq.id,
        fwdLine, fwdLabel, retLine, retLabel, particle,
        startX: adjStartX, endX: adjEndX,
        fwdY, retY,
        startTime: sched.start,
        endTime: sched.end,
        isRoundTrip: seq.isRoundTrip,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        isRightToLeft
      });
    });

    // 6. Animation Engine & Log Sync
    let isPlaying = false;
    let currentTime = 0;
    let lastTimestamp = 0;
    let rafId = null;

    let maxTime = Math.max(...Object.values(schedules).map(s => s.end));
    if (!isFinite(maxTime) || maxTime < 1000) maxTime = 1000;
    
    const slider = document.getElementById('timeline');
    const playBtn = document.getElementById('play-btn');
    const timeDisplay = document.getElementById('time-display');

    slider.max = maxTime;

    function renderFrame(time) {
      slider.value = time;
      timeDisplay.textContent = (time / 1000).toFixed(1) + 's';

      let stepToScroll = null;

      logicalData.sequences.forEach(seq => {
        const s = schedules[seq.id];
        if (!s) return;
        const logItem = document.getElementById('log-item-' + seq.id);
        if (logItem) {
          if (time >= s.start && time <= s.end) {
            logItem.classList.add('active');
            stepToScroll = logItem;
          } else {
            logItem.classList.remove('active');
          }
        }
      });

      if (stepToScroll) {
        stepToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      activityEls.forEach(act => {
        if (time >= act.startTime && time <= act.endTime) {
          act.el.classList.add('active');
        } else {
          act.el.classList.remove('active');
        }
      });

      logicalData.nodes.filter(n => n.type !== 'section').forEach(p => {
        const acts = participantActivities[p.id];
        const isActive = acts.some(act => time >= act.startTime && time <= act.endTime);
        if (isActive) participantEls[p.id].classList.add('active');
        else participantEls[p.id].classList.remove('active');
      });

      messageEls.forEach(msg => {
        const isActive = time >= msg.startTime && time <= msg.endTime;
        
        if (isActive) {
          msg.fwdLine.classList.add('active');
          if (msg.retLine) msg.retLine.classList.add('active');
        } else {
          msg.fwdLine.classList.remove('active');
          if (msg.retLine) msg.retLine.classList.remove('active');
        }

        const timing = timelines[msg.seqId];
        const halfTransit = timing ? (timing.duration / 2) : 400;
        const totalDuration = msg.endTime - msg.startTime;

        let showDot = false;
        let dotX = 0; let dotY = 0;

        if (isActive) {
          const elapsed = time - msg.startTime;
          if (elapsed < halfTransit) {
            showDot = true;
            const progress = elapsed / halfTransit;
            dotX = msg.startX + (msg.endX - msg.startX) * progress;
            dotY = msg.fwdY;
          } else if (msg.isRoundTrip && elapsed >= totalDuration - halfTransit) {
            showDot = true;
            const progress = (elapsed - (totalDuration - halfTransit)) / halfTransit;
            dotX = msg.endX + (msg.startX - msg.endX) * progress;
            dotY = msg.retY;
          }
        }

        if (showDot) {
          msg.particle.style.display = 'block';
          msg.particle.setAttribute('cx', dotX);
          msg.particle.setAttribute('cy', dotY);
        } else {
          msg.particle.style.display = 'none';
        }
      });
    }

    function tick(timestamp) {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (isPlaying) {
        currentTime += delta;
        if (currentTime > maxTime) {
          currentTime = 0;
          isPlaying = false;
          playBtn.textContent = '▶';
        }
        renderFrame(currentTime);
      }
      rafId = requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying && currentTime >= maxTime) currentTime = 0;
      if (isPlaying) lastTimestamp = performance.now();
    });

    slider.addEventListener('input', (e) => {
      currentTime = parseFloat(e.target.value);
      renderFrame(currentTime);
    });

    // 7. Zoom & Pan Logic
    const container = document.getElementById('canvas-container');
    const diagram = document.getElementById('diagram-container');
    let zoomScale = 1.0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startDragX = 0;
    let startDragY = 0;

    function applyTransform() {
      diagram.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoomScale})\`;
    }

    function fitView() {
      const pad = 40;
      const availableW = container.clientWidth - pad * 2 - 320; 
      const availableH = container.clientHeight - pad * 2;
      const diagramW = ${totalWidth};
      const diagramH = ${totalHeight};
      
      const scaleX = availableW / diagramW;
      const scaleY = availableH / diagramH;
      zoomScale = Math.min(scaleX, scaleY, 1);
      
      panX = (container.clientWidth - 320 - diagramW * zoomScale) / 2;
      panY = pad;
      applyTransform();
    }
    
    setTimeout(fitView, 10);

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      startDragX = e.clientX - panX;
      startDragY = e.clientY - panY;
      container.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startDragX;
      panY = e.clientY - startDragY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
      container.style.cursor = 'grab';
    });
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.1, zoomScale + delta), 3);
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      panX = mouseX - (mouseX - panX) * (newScale / zoomScale);
      panY = mouseY - (mouseY - panY) * (newScale / zoomScale);
      zoomScale = newScale;
      applyTransform();
    });

    document.getElementById('zoom-in').addEventListener('click', () => {
      zoomScale = Math.min(zoomScale * 1.2, 3);
      applyTransform();
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      zoomScale = Math.max(zoomScale / 1.2, 0.1);
      applyTransform();
    });
    document.getElementById('zoom-fit').addEventListener('click', fitView);

    // 8. Theme Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        themeToggleBtn.textContent = '🌙';
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        themeToggleBtn.textContent = '☀️';
      }
    });

    // Init
    renderFrame(0);
    rafId = requestAnimationFrame(tick);

  </script>
</body>
</html>`;
};
