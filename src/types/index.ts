import { Language, Theme } from '../i18n/translations';

// --- LOGICAL DATA (Logical Flow - AI Readable) ---
export interface LogicalNode {
  id: string; // E.g., 'node-client-1'
  type: string; // E.g., 'client', 'gateway', 'server', 'database', 'cache', 'queue', 'section'
  name: string; // User-defined name
  parentId?: string; // Section parent reference (for grouped nodes)
}

export interface LogicalEdge {
  id: string; // E.g., 'edge-1'
  step?: number; // Step order for simulations (Phase 3)
  from: string; // Source Node ID
  to: string; // Target Node ID
  fromPort: 'top' | 'right' | 'bottom' | 'left';
  toPort: 'top' | 'right' | 'bottom' | 'left';
  isAsync: boolean;
  protocol?: string; // E.g., 'HTTP', 'gRPC', 'WebSocket' (Phase 4)
  description?: string; // Description shown only in logs
}

export interface SequenceStep {
  id: string; // E.g., 'seq-1'
  stepNumber: number; // Step execution order group (1, 2, 3...)
  edgeId: string; // Foreign Key pointing to LogicalEdge.id
  isAsync: boolean; // True = fire and forget, don't block subsequent stepNumbers
  direction?: 'forward' | 'reverse'; // Animating particle direction (forward or reverse)
  isRoundTrip?: boolean; // True = round-trip A -> B -> A for sync responses
}

export interface LogicalDiagram {
  nodes: LogicalNode[];
  edges: LogicalEdge[];
  sequences: SequenceStep[]; // Flow logical ordering
}

// --- VISUAL DATA (Visual and Layout Layer - Human Readable) ---
export interface VisualNode {
  id: string; // Matches LogicalNode.id
  x: number;
  y: number;
  width?: number;
  height?: number;
  theme?: string; // Optional future color palettes
  zIndex?: number; // Render order (sections use -1 to appear behind children)
}

export interface TimelineTiming {
  sequenceId: string; // Foreign Key pointing to SequenceStep.id
  duration: number; // Transition transition duration in milliseconds
  delay: number; // Transition start delay in milliseconds
  internalProcess?: {
    text: string; // Text to show in tooltip bubble
    duration: number; // Tooltip display duration in milliseconds
  };
}

export interface VisualDiagram {
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
  };
  layoutNodes: Record<string, VisualNode>; // Quick record access by Node ID
  timelines: Record<string, TimelineTiming>; // Visual details & timings of the animation sequences
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
  
  // Phase 2 Canvas State
  logicalData: LogicalDiagram;
  visualData: VisualDiagram;
  
  // Custom Drag State (WKWebView doesn't support HTML5 drop)
  pendingDrop: { type: string; name: string } | null;

  // Phase 3 Playback State
  isPlaying: boolean;
  currentTime: number; // Current playback playhead time in ms
  playbackRate: number; // Rate: 0.5, 1, 1.5, 2
  activeSequenceIds: string[]; // Active animating sequence IDs
  schedules: Record<string, { start: number; end: number }>; // Pre-calculated schedules
  selectedSequenceId: string | null; // Selected/focused sequence ID

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
  
  // Preferences Operations
  changeLanguage: (lang: Language) => Promise<void>;
  changeTheme: (theme: Theme) => Promise<void>;
  loadAppPreferences: () => Promise<void>;
  
  // Phase 2 Canvas Actions
  addNode: (logical: LogicalNode, visual: VisualNode) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeDimensions: (id: string, width: number, height: number) => void;
  addEdge: (edge: LogicalEdge) => void;
  reconnectEdge: (
    edgeId: string,
    from: string,
    to: string,
    fromPort: 'top' | 'right' | 'bottom' | 'left',
    toPort: 'top' | 'right' | 'bottom' | 'left'
  ) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateCanvasViewport: (zoom: number, pan: { x: number; y: number }) => void;
  startDrag: (type: string, name: string) => void;
  cancelDrag: () => void;

  // Phase 3 Actions
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSelectedSequenceId: (id: string | null) => void;

  addSequenceStep: (step: SequenceStep, timing: TimelineTiming) => void;
  updateSequenceTiming: (seqId: string, duration: number, delay: number) => void;
  updateSequenceProcess: (seqId: string, text: string, duration: number) => void;
  deleteSequenceStep: (seqId: string) => void;
  setSequenceStepOrder: (seqId: string, stepNumber: number) => void;
  setSequenceStepDirection: (seqId: string, direction: 'forward' | 'reverse') => void;
  setSequenceStepRoundTrip: (seqId: string, isRoundTrip: boolean) => void;
  toggleSequenceAsync: (seqId: string) => void;
  clearCanvas: () => void;
  updateNodeDetails: (id: string, name: string, type: string, theme?: string) => void;
  updateEdgeDetails: (edgeId: string, protocol: string, isAsync: boolean, duration: number, delay: number, tooltipText?: string, tooltipDuration?: number, description?: string) => void;

  // Layout Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
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
  undo: () => void;
  redo: () => void;

  // Phase 7 Section Actions
  setNodeParent: (nodeId: string, parentId: string | null) => void;
  autoResizeSection: (sectionId: string) => void;
  deleteSectionWithChoice: (sectionId: string, deleteChildren: boolean) => void;

  // Save Actions
  isSaving: boolean;
  manualSave: () => Promise<void>;
}
