import { useEffect } from 'react';
import { useAppStore, startAutoSave, stopAutoSave } from './store/useAppStore';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { MainLayout } from './components/layout/MainLayout';
import { ComponentStudio } from './components/studio/ComponentStudio';
import { GoogleDriveService } from './services/googleDriveAPI';
import { ShareLoader } from './components/share/ShareLoader';

import { SharedDiagramLayout } from './components/layout/SharedDiagramLayout';

function App() {
  const currentWorkspace = useAppStore((state) => state.currentWorkspace);
  const loadAppPreferences = useAppStore((state) => state.loadAppPreferences);
  const currentView = useAppStore((state) => state.currentView);
  const isReadOnly = useAppStore((state) => state.isReadOnly);

  useEffect(() => {
    // Load app preferences (language and theme) on startup
    loadAppPreferences();

    // Google Drive Sync Feature Flag Check
    const isGoogleSyncEnabled = import.meta.env.VITE_ENABLE_GOOGLE_SYNC === 'true';

    if (isGoogleSyncEnabled) {
      // Initialize Google Drive Auth
      GoogleDriveService.initAuth();

      // If we have a persisted user, try to sync on startup
      const currentUser = useAppStore.getState().googleUser;
      if (currentUser) {
        GoogleDriveService.downloadFromDrive().catch(console.error);
      }
    }

    // Start auto-save background loop on app initialization
    startAutoSave();

    return () => {
      // Clean up on component unmount
      stopAutoSave();
    };
  }, []);

  useEffect(() => {
    // Periodically check for Service Worker updates every 30 minutes.
    // When a new SW is activated, autoUpdate in vite-plugin-pwa triggers page reload.
    if ('serviceWorker' in navigator) {
      const interval = setInterval(() => {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.update();
          })
          .catch((err) => {
            console.error('Service Worker update check failed:', err);
          });
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
  }, []);

  if (!currentWorkspace) {
    return (
      <>
        <ShareLoader />
        <WelcomeScreen />
      </>
    );
  }

  return (
    <>
      <ShareLoader />
      {isReadOnly ? (
        <SharedDiagramLayout />
      ) : currentView === 'studio' ? (
        <ComponentStudio />
      ) : (
        <MainLayout />
      )}
    </>
  );
}

export default App;
