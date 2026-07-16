import { Language, Theme } from '../i18n/translations';
import { ParticleType } from '../config/particles';
export type { ParticleType };


// --- GOOGLE SYNC ---
export interface GoogleUser {
  email: string;
  name: string;
  avatar: string;
  accessToken: string;
  expiresAt: number;
}

// --- PORT / HANDLE SYSTEM ---
export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export interface HandleConfig {
  id: string;       // Unique handle ID, e.g. 'top:50', 'right:33'
  side: PortSide;   // Which edge of the node
  offset: number;   // Percentage position along the edge (0-100)
  originalId?: string; // Tracks the original ID when loaded to allow stable keying/dragging
}

// --- LOGICAL DATA (Semantic/Topology Layer — AI Readable & Portable) ---
// This layer answers: "What components exist and how do they communicate?"
// It contains ZERO visual, coordinate, or animation data.
export interface LogicalNode {
  id: string;            // E.g., 'node-client-1'
  type: string;          // E.g., 'client', 'gateway', 'server', 'database', 'cache', 'queue', 'section'
  name: string;          // User-defined name
  parentId?: string;     // Section parent reference (for grouped nodes)
  properties?: Record<string, unknown>; // Extensible metadata: technology stack, capacity, etc.
}

export interface LogicalEdge {
  id: string;              // E.g., 'edge-1'
  sourceId: string;        // Source Node ID (formerly: from)
  targetId: string;        // Target Node ID (formerly: to)
  isAsync: boolean;        // true = event/fire-and-forget; false = sync
  protocol?: string;
  description?: string;
  properties?: Record<string, unknown>; // Extensible metadata: timeout, payload schema, etc.
}

export interface SequenceStep {
  id: string;              // E.g., 'seq-1'
  stepNumber: number;      // Step execution order group (1, 2, 3...)
  edgeId: string;          // Foreign Key → LogicalEdge.id
  isAsync: boolean;        // True = fire and forget, don't block subsequent stepNumbers
  isRoundTrip?: boolean;   // True = round-trip A→B→A for sync responses (request+response)
  // NOTE: 'direction' removed — use the "Swap Source/Target" action on edges instead.
}

export interface LogicalDiagram {
  schemaVersion: number;   // Schema version for future-proof migrations (current: 1)
  nodes: LogicalNode[];
  edges: LogicalEdge[];
  sequences: SequenceStep[];
}

// --- VISUAL DATA (Presentation & Layout Layer — Canvas-specific) ---
// This layer answers: "How is the logical model drawn and animated on the canvas?"
export interface VisualNode {
  id: string;              // Matches LogicalNode.id
  x: number;
  y: number;
  width?: number;
  height?: number;
  handles?: HandleConfig[]; // Custom connection points (moved from LogicalNode)
  theme?: string;           // Optional color palette
  zIndex?: number;          // Render order (sections use -1 to appear behind children)
  displayMode?: 'default' | 'icon-only';
  rotation?: number;
  customStyles?: {
    backgroundColor?: string;
    borderColor?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    borderRadius?: number;
  };
}

// NEW: Visual edge layer (moved from LogicalEdge)
export interface VisualEdge {
  id: string;              // Matches LogicalEdge.id
  sourceHandle?: string;   // Port ID for source (formerly: fromPort)
  targetHandle?: string;   // Port ID for target (formerly: toPort)
  particleType?: ParticleType;
  showArrow?: boolean;
  color?: string;          // Custom hex color for the edge line and arrowhead
}

export interface TimelineTiming {
  sequenceId: string;      // Foreign Key → SequenceStep.id
  duration: number;        // Transition duration in milliseconds
  delay: number;           // Transition start delay in milliseconds
  internalProcess?: {
    text: string;          // Text to show in tooltip bubble
    duration: number;      // Tooltip display duration in milliseconds
  };
}

export interface VisualDiagram {
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
    gridVisible?: boolean;
    bgColor?: string;
  };
  layoutNodes: Record<string, VisualNode>;      // Quick record access by Node ID
  layoutEdges: Record<string, VisualEdge>;      // NEW: Visual edge data by Edge ID
  timelines: Record<string, TimelineTiming>;    // Visual details & timings of animation sequences
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  path: string; // Absolute directory path on the OS
}

export interface DiagramMeta {
  id: string;
  name: string;
  updatedAt: string;
}

// --- ACTIVE SELECTION (Properties Panel) ---
export interface ActiveNodeProperties {
  id: string;
  name: string;
  type: string;
  theme: string;
  handles?: HandleConfig[];
  displayMode?: 'default' | 'icon-only';
  rotation?: number;
  customStyles?: {
    backgroundColor?: string;
    borderColor?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    borderRadius?: number;
  };
  isNew?: boolean;
}

export interface ActiveEdgeProperties {
  id: string;
  protocol: string;
  isAsync: boolean;
  stepNumber: number;
  duration: number;
  delay: number;
  tooltipText: string;
  tooltipDuration: number;
  description?: string;
  particleType?: ParticleType;
  showArrow?: boolean;
  color?: string;
  isNew?: boolean;
}

// --- CUSTOM COMPONENT STUDIO DATA ---
export type ShapeType = 'rectangle' | 'circle' | 'text' | 'image';

export interface ShapeLayer {
  id: string;
  type: ShapeType;
  name: string;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    rx?: number;
    rotation?: number;
  };
  content?: string;
}

export interface CustomComponentTemplate {
  componentId: string;
  name: string;
  category: string;
  dimensions: { width: number; height: number };
  layers: ShapeLayer[];
  createdAt: string;
}

export interface AppState {
  currentWorkspace: WorkspaceMeta | null;
  recentWorkspaces: WorkspaceMeta[];
  currentDiagram: DiagramMeta | null;
  isDirty: boolean;
  
  // Canvas View Mode
  viewMode: 'freeform' | 'sequence';

  // Phase 5 Studio State
  currentView: 'diagram' | 'studio';
  activeComponent: CustomComponentTemplate | null;
  selectedLayerId: string | null;
  libraryComponents: CustomComponentTemplate[];

  // Phase 6 History Stacks
  pastStates: Array<{ logicalData: LogicalDiagram; visualData: VisualDiagram }>;
  futureStates: Array<{ logicalData: LogicalDiagram; visualData: VisualDiagram }>;
  layoutVersion: number;
  
  // App Preferences
  language: Language;
  theme: Theme;
  maxSteps: number;
  
  // Phase 2 Canvas State
  logicalData: LogicalDiagram;
  visualData: VisualDiagram;
  focusedNodeId: string | null; // Focused node ID to trigger canvas centering
  
  // Custom Drag State (WKWebView doesn't support HTML5 drop)
  pendingDrop: { type: string; name: string } | null;

  // Active Selection State (drives the context-sensitive Properties panel)
  activeNodeProperties: ActiveNodeProperties | null;
  activeEdgeProperties: ActiveEdgeProperties | null;

  // Phase 3 Playback State
  isPlaying: boolean;
  currentTime: number; // Current playback playhead time in ms
  playbackRate: number; // Rate: 0.5, 1, 1.5, 2
  activeSequenceIds: string[]; // Active animating sequence IDs
  schedules: Record<string, { start: number; end: number }>; // Pre-calculated schedules
  selectedSequenceId: string | null; // Selected/focused sequence ID
  loopPlayback: boolean; // Loop playback when timeline reaches the end

  // Dynamic Layout State (Splitters & Toggle Sidebars)
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  timelineOpen: boolean;
  timelineHeight: number;
  
  // Actions
  setWorkspace: (ws: WorkspaceMeta | null) => void;
  setDiagram: (diagram: DiagramMeta | null) => void;
  setDirty: (status: boolean) => void;
  setRecentWorkspaces: (workspaces: WorkspaceMeta[]) => void;
  
  // Async Operations
  createWorkspace: (name: string, description: string) => Promise<WorkspaceMeta>;
  loadWorkspace: (path: string) => Promise<WorkspaceMeta>;
  fetchRecentWorkspaces: () => Promise<void>;
  saveWorkspaceDetails: (name: string, description: string) => Promise<void>;
  deleteWorkspace: (path: string) => Promise<void>;
  
  // Preferences Operations
  changeLanguage: (lang: Language) => Promise<void>;
  changeTheme: (theme: Theme) => Promise<void>;
  changeMaxSteps: (max: number) => Promise<void>;
  loadAppPreferences: () => Promise<void>;
  
  // Phase 2 Canvas Actions
  addNode: (logical: LogicalNode, visual: VisualNode) => void;
  cloneNode: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeDimensions: (id: string, width: number, height: number) => void;
  addEdge: (logical: LogicalEdge, visual: VisualEdge) => void;
  reconnectEdge: (
    edgeId: string,
    sourceId: string,
    targetId: string,
    sourceHandle: string,
    targetHandle: string
  ) => void;
  swapEdgeDirection: (edgeId: string) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateCanvasViewport: (zoom: number, pan: { x: number; y: number }) => void;
  setGridVisible: (visible: boolean) => void;
  setCanvasBgColor: (color: string | null) => void;
  startDrag: (type: string, name: string) => void;
  cancelDrag: () => void;
  setFocusedNodeId: (id: string | null) => void;

  // Phase 3 Actions
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSelectedSequenceId: (id: string | null) => void;
  toggleLoopPlayback: () => void;

  addSequenceStep: (step: SequenceStep, timing: TimelineTiming) => void;
  updateSequenceTiming: (seqId: string, duration: number, delay: number) => void;
  updateSequenceProcess: (seqId: string, text: string, duration: number) => void;
  deleteSequenceStep: (seqId: string) => void;
  setSequenceStepOrder: (seqId: string, stepNumber: number) => void;
  setSequenceStepRoundTrip: (seqId: string, isRoundTrip: boolean) => void;
  toggleSequenceAsync: (seqId: string) => void;
  clearCanvas: () => void;
  updateNodeDetails: (id: string, name: string, type: string, theme?: string, handles?: HandleConfig[], displayMode?: 'default' | 'icon-only', rotation?: number, customStyles?: any) => void;
  updateNodeHandles: (nodeId: string, handles: HandleConfig[]) => void;
  updateEdgeDetails: (
    edgeId: string,
    // Logical fields:
    protocol: string,
    isAsync: boolean,
    description?: string,
    // Visual/timeline fields:
    duration?: number,
    delay?: number,
    tooltipText?: string,
    tooltipDuration?: number,
    particleType?: ParticleType,
    showArrow?: boolean,
    color?: string
  ) => void;

  // Active Selection Actions
  setActiveNodeProperties: (props: ActiveNodeProperties | null) => void;
  setActiveEdgeProperties: (props: ActiveEdgeProperties | null) => void;
  clearActiveProperties: () => void;

  // View Mode
  toggleViewMode: () => void;
  isReadOnly: boolean;
  setReadOnly: (isReadOnly: boolean) => void;
  loadSharedDiagram: (logicalData: LogicalDiagram, visualData: VisualDiagram) => void;
  cloneSharedToWorkspace: (name: string) => Promise<WorkspaceMeta>;

  // Layout Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  openRightSidebar: () => void;
  toggleTimeline: () => void;
  setTimelineHeight: (height: number) => void;

  // Phase 5 Component Studio Actions
  setView: (view: 'diagram' | 'studio') => void;
  setActiveComponent: (comp: CustomComponentTemplate | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  addLayer: (layer: ShapeLayer) => void;
  updateLayer: (id: string, updates: Partial<ShapeLayer>) => void;
  deleteLayer: (id: string) => void;
  reorderLayers: (sourceIndex: number, destinationIndex: number) => void;
  saveComponentToLibrary: () => Promise<void>;
  loadLibrary: () => Promise<void>;
  deleteComponentFromLibrary: (componentId: string) => Promise<void>;

  // Phase 6 Actions
  applyAutoLayout: (direction: 'TB' | 'LR') => void;
  pushToHistory: () => void;
  pushStateToHistory: (logicalData: LogicalDiagram, visualData: VisualDiagram) => void;
  undo: () => void;
  redo: () => void;

  // Phase 7 Section Actions
  setNodeParent: (nodeId: string, parentId: string | null) => void;
  autoResizeSection: (sectionId: string) => void;
  deleteSectionWithChoice: (sectionId: string, deleteChildren: boolean) => void;

  // Save Actions
  isSaving: boolean;
  manualSave: () => Promise<void>;

  // Google Drive Sync State
  googleUser: GoogleUser | null;
  syncState: 'idle' | 'syncing' | 'error' | 'conflict';
  lastSyncedAt: number | null;
  hasUnsyncedChanges: boolean;

  // Google Drive Sync Actions
  setGoogleUser: (user: GoogleUser | null) => void;
  setSyncState: (state: 'idle' | 'syncing' | 'error' | 'conflict') => void;
  setLastSyncedAt: (timestamp: number | null) => void;
  setHasUnsyncedChanges: (hasUnsynced: boolean) => void;
}
