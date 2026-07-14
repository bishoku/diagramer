import JSZip from 'jszip';
import { StorageService, isTauri } from '../services/storage';
import { WorkspaceMeta } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

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
    
    await saveDiagramFn(newWs.path, JSON.stringify(cleanLogical), JSON.stringify(visualData));
    
    return newWs;
  } catch (err) {
    console.error('Failed to import workspace:', err);
    throw err;
  }
};
