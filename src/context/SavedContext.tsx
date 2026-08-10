import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSavedIds, setSavedIds } from '../services/StorageService';
import {
  startBackgroundGeofencing,
  stopBackgroundGeofencing,
} from '../tasks/backgroundLocation';

interface SavedContextValue {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggleSave: (id: string) => Promise<void>;
  loaded: boolean;
}

const SavedContext = createContext<SavedContextValue>({
  savedIds: new Set(),
  isSaved: () => false,
  toggleSave: async () => {},
  loaded: false,
});

export const useSaved = () => useContext(SavedContext);

export const SavedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedIds, setSavedIdsState] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    (async () => {
      const ids = await getSavedIds();
      setSavedIdsState(ids);
      setLoaded(true);
    })();
  }, []);

  // Start/stop geofencing based on saved locations
  useEffect(() => {
    if (!loaded) return;
    if (savedIds.size > 0) {
      startBackgroundGeofencing().catch((err) =>
        console.log('[SavedProvider] Failed to start geofencing:', err),
      );
    } else {
      stopBackgroundGeofencing().catch((err) =>
        console.log('[SavedProvider] Failed to stop geofencing:', err),
      );
    }
  }, [savedIds.size, loaded]);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const toggleSave = useCallback(async (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavedIdsState(next);
    await setSavedIds(next);
  }, [savedIds]);

  return (
    <SavedContext.Provider value={{ savedIds, isSaved, toggleSave, loaded }}>
      {children}
    </SavedContext.Provider>
  );
};
