
import { useAppStore } from '../store/useAppStore';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient: any = null;

// Determine if we are running in Tauri
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

export const GoogleDriveService = {
  /**
   * Initializes the Google Identity Services for Web.
   * For Tauri, it prepares the environment if necessary.
   */
  initAuth: () => {
    if (isTauri) {
      console.log('Tauri environment detected, relying on tauri-plugin-oauth for auth.');
      return;
    }

    // Web Environment - Load GIS script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // @ts-ignore
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            handleAuthSuccess(tokenResponse.access_token, tokenResponse.expires_in);
          }
        },
      });
    };
    document.head.appendChild(script);
  },

  /**
   * Initiates the Sign-In flow.
   */
  signIn: async () => {
    try {
      useAppStore.getState().setSyncState('syncing');

      if (isTauri) {
        // Desktop OAuth Flow via localhost loopback
        const { start, onUrl, cancel } = await import('@fabianlars/tauri-plugin-oauth');
        const port = await start({
          ports: [34567, 34568, 34569], // Try these local ports
          response: '<html><body>Authentication successful. You can close this window.</body></html>'
        });
        
        // Construct the Google OAuth URL
        const redirectUri = `http://127.0.0.1:${port}`;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${SCOPES}`;
        
        // Open the system browser
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(authUrl);

        // Wait for the redirect to hit our localhost server
        await new Promise<void>(async (resolve, reject) => {
          let timeout = setTimeout(() => {
            cancel(port).catch(console.error);
            reject(new Error('OAuth timeout'));
          }, 120000); // 2 mins

          const unlisten = await onUrl(async (urlStr: string) => {
            clearTimeout(timeout);
            unlisten(); // Stop listening
            
            try {
              const url = new URL(urlStr.replace('#', '?')); // URL fragment contains token
              const accessToken = url.searchParams.get('access_token');
              const expiresIn = url.searchParams.get('expires_in');
              
              if (accessToken) {
                await handleAuthSuccess(accessToken, Number(expiresIn));
                resolve();
              } else {
                reject(new Error('No access token found in redirect URL'));
              }
            } catch (e) {
              reject(e);
            } finally {
              cancel(port).catch(console.error);
            }
          });
        });

      } else {
        // Web OAuth Flow
        if (!tokenClient) {
          throw new Error('Google Identity Services not loaded yet.');
        }
        tokenClient.requestAccessToken();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      useAppStore.getState().setSyncState('error');
    }
  },

  /**
   * Checks the remote appDataFolder for existing backups and returns modifiedTime.
   */
  checkRemoteFiles: async (): Promise<Date | null> => {
    const token = useAppStore.getState().googleUser?.accessToken;
    if (!token) return null;

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="diagramer_sync.json"&fields=files(id,modifiedTime)', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        useAppStore.getState().setGoogleUser(null);
        return null;
      }
      if (!response.ok) throw new Error('Failed to check remote files');

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return new Date(data.files[0].modifiedTime);
      }
      return null;
    } catch (error) {
      console.error('Error checking remote files:', error);
      return null;
    }
  },

  /**
   * Uploads all current local workspaces and their data to Drive as a single bundled JSON.
   */
  uploadToDrive: async (): Promise<boolean> => {
    const state = useAppStore.getState();
    const token = state.googleUser?.accessToken;
    if (!token) return false;

    state.setSyncState('syncing');

    try {
      // 1. Gather all workspaces
      const { StorageService } = await import('./storage');
      const workspacesStr = await StorageService.get_recent_workspaces();
      const localWorkspaces = JSON.parse(workspacesStr);

      const bundleWorkspaces = [];

      for (const ws of localWorkspaces) {
        try {
          const diagramDataStr = await StorageService.load_diagram(ws.path);
          let logicalData, visualData;
          
          try {
            const parsed = JSON.parse(diagramDataStr);
            if (parsed.logicalData && parsed.visualData) {
              logicalData = parsed.logicalData;
              visualData = parsed.visualData;
            } else if (parsed.logical && parsed.visual) {
              logicalData = parsed.logical;
              visualData = parsed.visual;
            } else {
              logicalData = parsed;
              visualData = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {} };
            }
          } catch(e) {
            continue; // Skip invalid
          }

          bundleWorkspaces.push({
            id: ws.id || ws.path, // Fallback to path
            name: ws.name,
            description: ws.description || '',
            lastModified: ws.lastAccessed || ws.lastModified || new Date().toISOString(),
            logicalData,
            visualData
          });
        } catch (err) {
          console.warn(`Could not load diagram for workspace ${ws.name}`, err);
        }
      }

      // 2. Prepare the bundle
      const bundle = {
        timestamp: Date.now(),
        workspaces: bundleWorkspaces
      };
      
      const fileContent = JSON.stringify(bundle);
      let metadata: any = {
        name: 'diagramer_sync.json'
      };

      // 3. Check if file already exists to get its ID for updating
      const checkRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="diagramer_sync.json"', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.status === 401) {
        useAppStore.getState().setGoogleUser(null);
        return false;
      }
      const checkData = await checkRes.json();
      
      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (checkData.files && checkData.files.length > 0) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${checkData.files[0].id}?uploadType=multipart`;
        method = 'PATCH';
      } else {
        metadata.parents = ['appDataFolder'];
      }

      // 4. Construct multipart body
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelimiter = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      // 5. Send request
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAppStore.getState().setGoogleUser(null);
          return false;
        }
        throw new Error('Upload failed');
      }

      state.setLastSyncedAt(Date.now());
      state.setHasUnsyncedChanges(false);
      state.setSyncState('idle');
      return true;

    } catch (error) {
      console.error('Upload to Drive error:', error);
      state.setSyncState('error');
      return false;
    }
  },

  /**
   * Downloads the remote bundle and applies all workspaces to local storage (Last Write Wins).
   */
  downloadFromDrive: async (): Promise<boolean> => {
    const state = useAppStore.getState();
    const token = state.googleUser?.accessToken;
    if (!token) return false;

    state.setSyncState('syncing');

    try {
      const checkRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="diagramer_sync.json"', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (checkRes.status === 401) {
        useAppStore.getState().setGoogleUser(null);
        return false;
      }

      const checkData = await checkRes.json();
      
      if (!checkData.files || checkData.files.length === 0) {
        // No remote backup found, just mark as synced
        state.setSyncState('idle');
        return true;
      }

      const fileId = checkData.files[0].id;
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        useAppStore.getState().setGoogleUser(null);
        return false;
      }
      if (!response.ok) throw new Error('Failed to download file');

      const bundle = await response.json();
      
      // Merge into local storage
      const { StorageService } = await import('./storage');
      const localWsStr = await StorageService.get_recent_workspaces();
      const localWorkspaces = JSON.parse(localWsStr);

      for (const remoteWs of (bundle.workspaces || [])) {
        // Match by name
        let match = localWorkspaces.find((w: any) => w.name === remoteWs.name);
        let targetPath = match ? match.path : null;

        let shouldOverwrite = false;

        if (match) {
          const localTime = new Date(match.lastAccessed || match.lastModified || 0).getTime();
          const remoteTime = new Date(remoteWs.lastModified).getTime();
          if (remoteTime > localTime) {
            shouldOverwrite = true;
          }
        } else {
          shouldOverwrite = true;
        }

        if (shouldOverwrite) {
          if (!targetPath) {
            // Create new local workspace
            const newWsStr = await StorageService.create_workspace(remoteWs.name, remoteWs.description || '');
            const newWs = JSON.parse(newWsStr);
            targetPath = newWs.path;
          }

          // Save diagram data
          await StorageService.save_diagram(
            targetPath!, 
            'default',
            JSON.stringify(remoteWs.logicalData), 
            JSON.stringify(remoteWs.visualData)
          );

          // Update lastModified/lastAccessed in local workspace meta so we match remote
          const updatedWsStr = await StorageService.load_workspace(targetPath!);
          const updatedWs = JSON.parse(updatedWsStr);
          updatedWs.lastAccessed = remoteWs.lastModified;
          updatedWs.lastModified = remoteWs.lastModified;
          await StorageService.save_workspace(JSON.stringify(updatedWs));
        }
      }

      // If a workspace is currently active, reload its data into Zustand if it was updated
      if (state.currentWorkspace) {
        const activeRemote = bundle.workspaces.find((w: any) => w.name === state.currentWorkspace?.name);
        
        if (activeRemote) {
          const wsAny = state.currentWorkspace as any;
          const localTime = new Date(wsAny.lastAccessed || wsAny.lastModified || wsAny.createdAt || 0).getTime();
          const remoteTime = new Date(activeRemote.lastModified).getTime();
          
          if (remoteTime > localTime) {
            useAppStore.setState({
              logicalData: activeRemote.logicalData,
              visualData: activeRemote.visualData,
              isDirty: false
            });
          }
        }
      }

      state.setLastSyncedAt(Date.now());
      state.setHasUnsyncedChanges(false);
      state.setSyncState('idle');

      // Refresh recent workspaces in the store
      await state.fetchRecentWorkspaces();
      return true;

    } catch (error) {
      console.error('Download from Drive error:', error);
      state.setSyncState('error');
      return false;
    }
  }
};

/**
 * Helper to fetch user profile after getting access token
 */
async function handleAuthSuccess(accessToken: string, expiresIn: number) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await response.json();
    
    useAppStore.getState().setGoogleUser({
      email: profile.email,
      name: profile.name,
      avatar: profile.picture,
      accessToken,
      expiresAt: Date.now() + (expiresIn * 1000)
    });
    useAppStore.getState().setSyncState('idle');

    // Automatically check and merge from remote on login
    await GoogleDriveService.downloadFromDrive();

  } catch (error) {
    console.error('Failed to fetch user profile', error);
    useAppStore.getState().setSyncState('error');
  }
}
