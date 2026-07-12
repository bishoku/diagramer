use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};
use chrono::Utc;
use uuid::Uuid;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceMeta {
    id: String,
    name: String,
    description: String,
    created_at: String,
    last_accessed: String,
    path: String,
}

// Helper to retrieve recent workspaces list from app config directory
fn get_recent_workspaces_list(app_handle: &AppHandle) -> Result<Vec<WorkspaceMeta>, String> {
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    let config_file = config_dir.join("recent_workspaces.json");
    if !config_file.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&config_file).map_err(|e| e.to_string())?;
    let list: Vec<WorkspaceMeta> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(list)
}

// Helper to save recent workspaces list to app config directory
fn save_recent_workspaces_list(app_handle: &AppHandle, list: &Vec<WorkspaceMeta>) -> Result<(), String> {
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    let config_file = config_dir.join("recent_workspaces.json");
    let content = serde_json::to_string(list).map_err(|e| e.to_string())?;
    fs::write(&config_file, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn create_workspace(
    app_handle: AppHandle,
    name: String,
    description: String,
) -> Result<String, String> {
    // 1. Resolve workspace path: home_dir/.diagramer/name
    let home = app_handle.path().home_dir().map_err(|e| format!("Failed to get home directory: {}", e))?;
    let base_dir = home.join(".diagramer");
    let ws_dir = base_dir.join(&name);
    
    if ws_dir.exists() {
        return Err("A workspace or folder with this name already exists in the `.diagramer` directory.".to_string());
    }
    
    // 2. Create the workspace directory (creates base_dir too if missing)
    fs::create_dir_all(&ws_dir).map_err(|e| format!("Failed to create workspace directory: {}", e))?;
    
    // 3. Create the diagrams/ subfolder
    let diagrams_dir = ws_dir.join("diagrams");
    fs::create_dir_all(&diagrams_dir).map_err(|e| format!("Failed to create diagrams subfolder: {}", e))?;
    
    // 4. Build WorkspaceMeta
    let current_time = Utc::now().to_rfc3339();
    let meta = WorkspaceMeta {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        created_at: current_time.clone(),
        last_accessed: current_time,
        path: ws_dir.to_string_lossy().to_string(),
    };
    
    // 5. Save workspace.json inside workspace directory
    let workspace_json_path = ws_dir.join("workspace.json");
    let json_content = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(&workspace_json_path, json_content).map_err(|e| format!("Failed to write workspace.json: {}", e))?;
    
    // 6. Update recent workspaces list
    let mut list = get_recent_workspaces_list(&app_handle).unwrap_or_default();
    list.retain(|w| w.path != meta.path); // remove duplicate if exists
    list.insert(0, meta.clone());
    if list.len() > 15 {
        list.truncate(15);
    }
    let _ = save_recent_workspaces_list(&app_handle, &list);
    
    // Return serialized meta string
    let result_json = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
    Ok(result_json)
}

#[tauri::command]
fn load_workspace(app_handle: AppHandle, path: String) -> Result<String, String> {
    let ws_dir = Path::new(&path);
    let workspace_json_path = ws_dir.join("workspace.json");
    
    if !workspace_json_path.exists() {
        return Err("This directory is not a valid workspace. workspace.json is missing.".to_string());
    }
    
    // Read and parse workspace.json
    let content = fs::read_to_string(&workspace_json_path)
        .map_err(|e| format!("Failed to read workspace.json: {}", e))?;
    let mut meta: WorkspaceMeta = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse workspace.json: {}", e))?;
    
    // Update last accessed time
    meta.last_accessed = Utc::now().to_rfc3339();
    
    // Write updated metadata back to workspace.json
    let json_content = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(&workspace_json_path, json_content)
        .map_err(|e| format!("Failed to update workspace.json: {}", e))?;
    
    // Update recent workspaces list
    let mut list = get_recent_workspaces_list(&app_handle).unwrap_or_default();
    list.retain(|w| w.path != meta.path);
    list.insert(0, meta.clone());
    if list.len() > 15 {
        list.truncate(15);
    }
    let _ = save_recent_workspaces_list(&app_handle, &list);
    
    // Return serialized meta string
    let result_json = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
    Ok(result_json)
}

#[tauri::command]
fn get_recent_workspaces(app_handle: AppHandle) -> Result<String, String> {
    let list = get_recent_workspaces_list(&app_handle)?;
    let result_json = serde_json::to_string(&list).map_err(|e| e.to_string())?;
    Ok(result_json)
}

#[tauri::command]
fn save_recent_workspaces(app_handle: AppHandle, workspaces_json: String) -> Result<(), String> {
    let list: Vec<WorkspaceMeta> = serde_json::from_str(&workspaces_json).map_err(|e| e.to_string())?;
    save_recent_workspaces_list(&app_handle, &list)?;
    Ok(())
}

#[tauri::command]
fn save_workspace(app_handle: AppHandle, meta_json: String) -> Result<(), String> {
    let meta: WorkspaceMeta = serde_json::from_str(&meta_json).map_err(|e| e.to_string())?;
    let ws_path = Path::new(&meta.path);
    
    if !ws_path.exists() {
        return Err("Workspace directory does not exist".to_string());
    }
    
    let workspace_json_path = ws_path.join("workspace.json");
    let json_content = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(&workspace_json_path, json_content)
        .map_err(|e| format!("Failed to save workspace.json: {}", e))?;
    
    // Update recent workspaces list with this updated metadata
    let mut list = get_recent_workspaces_list(&app_handle).unwrap_or_default();
    if let Some(pos) = list.iter().position(|w| w.path == meta.path) {
        list[pos] = meta;
    } else {
        list.insert(0, meta);
    }
    save_recent_workspaces_list(&app_handle, &list)?;
    
    Ok(())
}

#[tauri::command]
fn load_preferences(app_handle: AppHandle) -> Result<String, String> {
    let home = app_handle.path().home_dir().map_err(|e| format!("Failed to resolve home dir: {}", e))?;
    let base_dir = home.join(".diagramer");
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir).map_err(|e| format!("Failed to create .diagramer dir: {}", e))?;
    }
    let pref_file = base_dir.join("preferences.json");
    if !pref_file.exists() {
        let default_pref = serde_json::json!({
            "language": "system",
            "theme": "dark"
        });
        return Ok(default_pref.to_string());
    }
    let content = fs::read_to_string(&pref_file).map_err(|e| format!("Failed to read preferences.json: {}", e))?;
    Ok(content)
}

#[tauri::command]
fn save_preferences(app_handle: AppHandle, preferences_json: String) -> Result<(), String> {
    let home = app_handle.path().home_dir().map_err(|e| format!("Failed to resolve home dir: {}", e))?;
    let base_dir = home.join(".diagramer");
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir).map_err(|e| format!("Failed to create .diagramer dir: {}", e))?;
    }
    let pref_file = base_dir.join("preferences.json");
    fs::write(&pref_file, preferences_json).map_err(|e| format!("Failed to write preferences.json: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_global_components_dir(app_handle: AppHandle) -> Result<String, String> {
    let home = app_handle.path().home_dir().map_err(|e| format!("Failed to resolve home dir: {}", e))?;
    let components_dir = home.join(".diagramer").join("components");
    if !components_dir.exists() {
        fs::create_dir_all(&components_dir).map_err(|e| format!("Failed to create global components dir: {}", e))?;
    }
    Ok(components_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn load_diagram(path: String) -> Result<String, String> {
    let ws_path = Path::new(&path);
    if !ws_path.exists() {
        return Err("Workspace directory does not exist".to_string());
    }
    
    let logical_file = ws_path.join("logical.json");
    let visual_file = ws_path.join("visual.json");
    
    let logical_content = if logical_file.exists() {
        fs::read_to_string(&logical_file)
            .map_err(|e| format!("Failed to read logical.json: {}", e))?
    } else {
        r#"{"nodes":[],"edges":[]}"#.to_string()
    };
    
    let visual_content = if visual_file.exists() {
        fs::read_to_string(&visual_file)
            .map_err(|e| format!("Failed to read visual.json: {}", e))?
    } else {
        r#"{"canvas":{"zoom":1,"pan":{"x":0,"y":0}},"layoutNodes":{}}"#.to_string()
    };
    
    let combined = serde_json::json!({
        "logical": serde_json::from_str::<serde_json::Value>(&logical_content).unwrap_or(serde_json::json!({"nodes":[],"edges":[]})),
        "visual": serde_json::from_str::<serde_json::Value>(&visual_content).unwrap_or(serde_json::json!({"canvas":{"zoom":1,"pan":{"x":0,"y":0}},"layoutNodes":{}}))
    });
    
    Ok(combined.to_string())
}

#[tauri::command]
fn save_diagram(path: String, logical_json: String, visual_json: String) -> Result<(), String> {
    let ws_path = Path::new(&path);
    if !ws_path.exists() {
        return Err("Workspace directory does not exist".to_string());
    }
    
    let logical_file = ws_path.join("logical.json");
    let visual_file = ws_path.join("visual.json");
    
    // Parse to validate JSON structures
    let logical_val: serde_json::Value = serde_json::from_str(&logical_json)
        .map_err(|e| format!("Invalid logical JSON format: {}", e))?;
    let visual_val: serde_json::Value = serde_json::from_str(&visual_json)
        .map_err(|e| format!("Invalid visual JSON format: {}", e))?;
        
    fs::write(&logical_file, serde_json::to_string_pretty(&logical_val).unwrap())
        .map_err(|e| format!("Failed to write logical.json: {}", e))?;
        
    fs::write(&visual_file, serde_json::to_string_pretty(&visual_val).unwrap())
        .map_err(|e| format!("Failed to write visual.json: {}", e))?;
        
    Ok(())
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    fs::write(file_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }
    let content = fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(content)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn list_json_files_in_dir(dir_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let mut results = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        if file_path.is_file() && file_path.extension().map_or(false, |ext| ext == "json") {
            if let Ok(content) = fs::read_to_string(&file_path) {
                results.push(content);
            }
        }
    }
    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_workspace,
            load_workspace,
            get_recent_workspaces,
            save_recent_workspaces,
            save_workspace,
            load_preferences,
            save_preferences,
            get_global_components_dir,
            load_diagram,
            save_diagram,
            save_text_file,
            read_text_file,
            delete_file,
            list_json_files_in_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
