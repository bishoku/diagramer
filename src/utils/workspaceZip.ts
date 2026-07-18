import JSZip from 'jszip';
import { StorageService, isTauri } from '../services/storage';
import { WorkspaceMeta } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

// ─── Default handle IDs that every node has when no custom handles are set ─────



function parseHandleId(id: string): { side: string; offset: number } | null {
  const parts = id.split(':');
  if (parts.length !== 2) return null;
  const offset = Number(parts[1]);
  if (isNaN(offset) || offset < 0 || offset > 100) return null;
  return { side: parts[0], offset };
}



/**
 * Full repair that requires both logicalData and visualData.
 * This is the version called during import.
 *
 * Repairs applied:
 * 1. Missing handles: injects handle IDs referenced in layoutEdges but absent
 *    from the corresponding node's handles array.
 * 2. Absolute child coordinates: child nodes (with parentId) that accidentally
 *    use absolute canvas coordinates are converted to section-relative coordinates.
 */
export function repairDiagram(
  logicalData: any,
  visualData: any
): { logicalData: any; visualData: any; repairs: string[] } {
  const repairs: string[] = [];
  if (!visualData || !logicalData) return { logicalData, visualData, repairs };

  const layoutNodes: Record<string, any> = { ...(visualData.layoutNodes ?? {}) };
  const edges: any[] = logicalData.edges ?? [];
  const nodes: any[] = logicalData.nodes ?? [];
  const layoutEdges: Record<string, any> = visualData.layoutEdges ?? {};

  // ── Repair 1: Missing handles ────────────────────────────────────────────
  const requiredHandles = new Map<string, Set<string>>();
  const need = (nodeId: string, handleId: string) => {
    if (!nodeId || !handleId) return;
    if (!requiredHandles.has(nodeId)) requiredHandles.set(nodeId, new Set());
    requiredHandles.get(nodeId)!.add(handleId);
  };

  for (const le of edges) {
    const ve = layoutEdges[le.id];
    if (!ve) continue;
    if (ve.sourceHandle) need(le.sourceId, ve.sourceHandle);
    if (ve.targetHandle) need(le.targetId, ve.targetHandle);
  }

  for (const [nodeId, handleIds] of requiredHandles.entries()) {
    const vn = layoutNodes[nodeId];
    if (!vn) continue;

    const existingHandles: any[] = vn.handles && vn.handles.length > 0
      ? [...vn.handles]
      : [
          { id: 'top:50',    side: 'top',    offset: 50 },
          { id: 'right:50',  side: 'right',  offset: 50 },
          { id: 'bottom:50', side: 'bottom', offset: 50 },
          { id: 'left:50',   side: 'left',   offset: 50 },
        ];

    const existingIds = new Set(existingHandles.map((h: any) => h.id));
    let changed = false;

    for (const hid of handleIds) {
      if (existingIds.has(hid)) continue;
      const parsed = parseHandleId(hid);
      if (!parsed) continue;
      existingHandles.push({ id: hid, side: parsed.side, offset: parsed.offset });
      existingIds.add(hid);
      changed = true;
      repairs.push(`Node '${nodeId}': added missing handle '${hid}'`);
    }

    if (changed) {
      layoutNodes[nodeId] = { ...vn, handles: existingHandles };
    }
  }

  // ── Repair 2: Absolute → relative child coordinates ──────────────────────
  // React Flow requires parentId child nodes to use coordinates relative to
  // their parent section. If absolute canvas coords are provided, children
  // stack up near (0,0) inside the section.
  //
  // Heuristic: A child uses absolute coordinates when BOTH:
  //   (a) Its (x,y) falls outside the section's dimensions as relative coords.
  //   (b) After subtracting section (x,y), the result falls inside the section.

  const sectionMap: Record<string, any> = {};
  for (const ln of nodes) {
    if (ln.type === 'section') {
      const vn = layoutNodes[ln.id];
      if (vn) sectionMap[ln.id] = vn;
    }
  }

  for (const ln of nodes) {
    const parentId = ln.parentId;
    if (!parentId || !sectionMap[parentId]) continue;

    const vn = layoutNodes[ln.id];
    if (!vn) continue;

    const section = sectionMap[parentId];
    const sx = section.x ?? 0;
    const sy = section.y ?? 0;
    const sw = section.width ?? 9999;
    const sh = section.height ?? 9999;
    const nx = vn.x ?? 0;
    const ny = vn.y ?? 0;
    const nw = vn.width ?? 224;
    const nh = vn.height ?? 52;

    const outsideAsRelative = nx > sw || ny > sh || nx < -nw || ny < -nh;
    const relX = nx - sx;
    const relY = ny - sy;
    const insideAfterConversion = relX >= 0 && relY >= 0 && relX < sw && relY < sh;

    if (outsideAsRelative && insideAfterConversion) {
      layoutNodes[ln.id] = { ...vn, x: relX, y: relY };
      repairs.push(
        `Node '${ln.id}': converted absolute (${nx},${ny}) → section-relative (${relX},${relY}) within '${parentId}'`
      );
    }
  }

  // ── Repair 3: Orphaned annotations → synthesise missing sticky_note nodes ─
  // A sticky note requires three entries:
  //   (a) logicalData.nodes[type=sticky_note]
  //   (b) visualData.layoutNodes[id]   — position + size
  //   (c) visualData.annotations[id]  — content + style
  //
  // If an annotation exists but (a) or (b) are missing, synthesise them.

  const annotations: Record<string, any> = visualData.annotations ?? {};
  const logicalNodeIds = new Set(nodes.map((n: any) => n.id));
  const repairedNodes = [...nodes];

  for (const [noteId, annotation] of Object.entries(annotations)) {
    if (!annotation || typeof annotation !== 'object') continue;

    // (a) Missing logical node
    if (!logicalNodeIds.has(noteId)) {
      repairedNodes.push({
        id: noteId,
        type: 'sticky_note',
        name: annotation.header ?? 'Sticky Note',
        properties: { _visualOnly: true },
      });
      logicalNodeIds.add(noteId);
      repairs.push(`Annotation '${noteId}': synthesised missing logicalData.nodes entry`);
    }

    // (b) Missing layoutNode (position/size)
    if (!layoutNodes[noteId]) {
      // Place in a safe default position; the user can move it after import
      layoutNodes[noteId] = {
        id: noteId,
        x: 50,
        y: 50,
        width: 280,
        height: 160,
      };
      repairs.push(`Annotation '${noteId}': synthesised missing layoutNodes entry at (50, 50)`);
    }
  }

  const repairedLogical = repairedNodes.length !== nodes.length
    ? { ...logicalData, nodes: repairedNodes }
    : logicalData;

  const repairedVisual = repairs.length > 0
    ? { ...visualData, layoutNodes, annotations }
    : visualData;

  return { logicalData: repairedLogical, visualData: repairedVisual, repairs };
}



export interface ImportConflict {
  compId: string;
  name: string;
  fileContent: string;
}

export type ConflictResolution = 'overwrite' | 'copy' | 'skip';

/**
 * Exports a workspace and its custom components into a .dproj ZIP file.
 */
export const exportWorkspace = async (
  workspace: WorkspaceMeta,
  language: 'tr' | 'en'
): Promise<void> => {
  try {
    // 1. Load diagram data
    const diagJson = await StorageService.load_diagram(workspace.path);
    const diag = JSON.parse(diagJson);
    
    const logicalData = diag.logicalData || diag.logical || { nodes: [], edges: [] };
    const nodes = logicalData.nodes || [];
    
    // 2. Identify custom components used in the diagram
    const customCompIds = nodes
      .filter((n: any) => n.type && n.type.startsWith('custom-comp-'))
      .map((n: any) => n.type);
    const uniqueCompIds = Array.from(new Set(customCompIds)) as string[];
    
    // 3. Load custom component contents
    const componentsDir = await StorageService.get_global_components_dir();
    const componentsData: Record<string, string> = {};
    for (const compId of uniqueCompIds) {
      try {
        const compPath = `${componentsDir}/${compId}.json`;
        const content = await StorageService.read_text_file(compPath);
        componentsData[compId] = content;
      } catch (err) {
        console.error(`Failed to read custom component ${compId}:`, err);
      }
    }
    
    // 4. Create ZIP archive
    const zip = new JSZip();
    zip.file('workspace.json', JSON.stringify(workspace, null, 2));
    zip.file('diagram.json', diagJson);
    
    if (Object.keys(componentsData).length > 0) {
      const compFolder = zip.folder('components');
      for (const [compId, content] of Object.entries(componentsData)) {
        compFolder?.file(`${compId}.json`, content);
      }
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const defaultName = `${workspace.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.dproj`;
    
    // 5. Save the file
    if (isTauri()) {
      const savePath = await save({
        title: language === 'tr' ? 'Projeyi Kaydet' : 'Save Project',
        defaultPath: defaultName,
        filters: [{ name: 'YADA Project', extensions: ['dproj'] }]
      });
      
      if (!savePath) return;
      
      const buffer = await zipBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await writeFile(savePath, bytes);
    } else {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Failed to export workspace:', err);
    throw err;
  }
};

/**
 * Imports a workspace and resolves custom component conflicts.
 */
export const importWorkspace = async (
  zipData: ArrayBuffer | Uint8Array,
  createWorkspaceFn: (name: string, description: string) => Promise<WorkspaceMeta>,
  saveDiagramFn: (path: string, logicalJson: string, visualJson: string) => Promise<void>,
  resolveConflictsFn: (conflicts: ImportConflict[]) => Promise<Record<string, ConflictResolution>>,
  language: 'tr' | 'en'
): Promise<WorkspaceMeta> => {
  try {
    const zip = await JSZip.loadAsync(zipData);
    const workspaceFile = zip.file('workspace.json');
    const diagramFile = zip.file('diagram.json');
    
    if (!workspaceFile || !diagramFile) {
      throw new Error(
        language === 'tr' 
          ? 'Geçersiz proje dosyası: workspace.json veya diagram.json eksik.' 
          : 'Invalid project file: missing workspace.json or diagram.json.'
      );
    }
    
    const originalMeta = JSON.parse(await workspaceFile.async('string'));
    const diagramJson = await diagramFile.async('string');
    
    // 1. Check custom component conflicts
    const componentsFolder = zip.folder('components');
    const conflicts: ImportConflict[] = [];
    const componentsDir = await StorageService.get_global_components_dir();
    
    // Safe array of component files inside ZIP
    const filesToProcess: { fileName: string; fileObj: JSZip.JSZipObject }[] = [];
    if (componentsFolder) {
      componentsFolder.forEach((relPath, fileObj) => {
        if (!fileObj.dir && relPath.endsWith('.json')) {
          filesToProcess.push({ fileName: relPath, fileObj });
        }
      });
    }
    
    for (const item of filesToProcess) {
      const compId = item.fileName.replace('.json', '');
      const content = await item.fileObj.async('string');
      
      let exists = false;
      try {
        await StorageService.read_text_file(`${componentsDir}/${compId}.json`);
        exists = true;
      } catch (_) {}
      
      if (exists) {
        const parsed = JSON.parse(content);
        conflicts.push({
          compId,
          name: parsed.name || compId,
          fileContent: content
        });
      }
    }
    
    // 2. Obtain resolution from UI if conflicts exist
    const resolutions = conflicts.length > 0 ? await resolveConflictsFn(conflicts) : {};
    const idMapping: Record<string, string> = {};
    
    // 3. Save custom components based on resolutions
    // First, save non-conflicted ones
    for (const item of filesToProcess) {
      const compId = item.fileName.replace('.json', '');
      const content = await item.fileObj.async('string');
      
      const conflict = conflicts.find(c => c.compId === compId);
      if (!conflict) {
        // No conflict, save directly
        await StorageService.save_text_file(`${componentsDir}/${compId}.json`, content);
      }
    }
    
    // Handle conflicted ones
    for (const conflict of conflicts) {
      const resolution = resolutions[conflict.compId] || 'skip';
      
      if (resolution === 'overwrite') {
        await StorageService.save_text_file(`${componentsDir}/${conflict.compId}.json`, conflict.fileContent);
      } else if (resolution === 'copy') {
        const newCompId = `custom-comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const parsed = JSON.parse(conflict.fileContent);
        parsed.componentId = newCompId;
        parsed.name = `${parsed.name} (${language === 'tr' ? 'Kopyalanan' : 'Imported'})`;
        
        await StorageService.save_text_file(`${componentsDir}/${newCompId}.json`, JSON.stringify(parsed, null, 2));
        idMapping[conflict.compId] = newCompId;
      }
      // If 'skip', do nothing (uses existing component in library)
    }
    
    // 4. Create the new workspace
    // We modify name slightly to show imported status or keep it
    const newName = `${originalMeta.name} (${language === 'tr' ? 'İçeri Aktarılan' : 'Imported'})`;
    const newWs = await createWorkspaceFn(newName, originalMeta.description || '');
    
    // 5. Update diagram component IDs if mapping happened, and save it
    const parsedDiagram = JSON.parse(diagramJson);
    const logicalData = parsedDiagram.logical || parsedDiagram.logicalData || { nodes: [], edges: [] };
    const visualData = parsedDiagram.visual || parsedDiagram.visualData || {};
    
    const nodes = logicalData.nodes || [];
    nodes.forEach((node: any) => {
      if (node.type && idMapping[node.type]) {
        node.type = idMapping[node.type];
      }
    });
    
    const cleanLogical = {
      nodes,
      edges: logicalData.edges || [],
      sequences: logicalData.sequences || []
    };

    // 5b. Auto-repair: handles, section coordinates, and sticky note consistency.
    const { logicalData: repairedLogical, visualData: repairedVisual, repairs } = repairDiagram(cleanLogical, visualData);
    if (repairs.length > 0) {
      console.info(`[import] Applied ${repairs.length} repair(s):`, repairs);
    }

    await saveDiagramFn(newWs.path, JSON.stringify(repairedLogical), JSON.stringify(repairedVisual));

    
    return newWs;
  } catch (err) {
    console.error('Failed to import workspace:', err);
    throw err;
  }
};
