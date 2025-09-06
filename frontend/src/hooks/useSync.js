import { useState, useEffect, useCallback } from 'react';
import syncService from '../services/sync.js';

/**
 * Hook for managing sync operations
 * Provides manual sync, auto-sync control, and sync status
 */
export function useSync() {
  const [syncStatus, setSyncStatus] = useState({
    autoSyncEnabled: false,
    syncInterval: 60,
    lastSyncTime: null,
    syncedEventsCount: 0,
    syncInProgress: false,
    isAuthenticated: false,
    stats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastError: null
    },
    workerAvailable: false
  });

  const [syncHistory, setSyncHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Execute manual sync
  const executeManualSync = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await syncService.executeManualSync();
      
      if (result.success) {
        // Refresh sync status
        await refreshSyncStatus();
        await refreshSyncHistory();
      } else {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Sync failed';
      setError(errorMessage);
      console.error('Manual sync failed:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Start auto-sync
  const startAutoSync = useCallback(async () => {
    try {
      const started = await syncService.startAutoSync();
      
      if (started) {
        await refreshSyncStatus();
      }
      
      return started;
    } catch (err) {
      console.error('Failed to start auto-sync:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // Stop auto-sync
  const stopAutoSync = useCallback(() => {
    syncService.stopAutoSync();
    refreshSyncStatus();
  }, []);

  // Preview sync changes
  const previewSync = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const preview = await syncService.previewSync();
      return preview;
    } catch (err) {
      setError(err.message);
      console.error('Sync preview failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh all synced events
  const refreshAllSyncedEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await syncService.refreshAllSyncedEvents();
      
      if (result.success) {
        await refreshSyncStatus();
        await refreshSyncHistory();
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to refresh synced events:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear all synced events
  const clearAllSyncedEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await syncService.clearAllSyncedEvents();
      
      if (result.success) {
        await refreshSyncStatus();
        await refreshSyncHistory();
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to clear synced events:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test sync functionality
  const testSync = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await syncService.testSync();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Sync test failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh sync status
  const refreshSyncStatus = useCallback(async () => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to refresh sync status:', err);
    }
  }, []);

  // Refresh sync history
  const refreshSyncHistory = useCallback(async () => {
    try {
      const history = await syncService.getSyncHistory();
      setSyncHistory(history);
    } catch (err) {
      console.error('Failed to refresh sync history:', err);
    }
  }, []);

  // Calculate sync success rate
  const getSyncSuccessRate = useCallback(() => {
    const { totalSyncs, successfulSyncs } = syncStatus.stats;
    if (totalSyncs === 0) return 0;
    return Math.round((successfulSyncs / totalSyncs) * 100);
  }, [syncStatus.stats]);

  // Get time until next sync
  const getTimeUntilNextSync = useCallback(() => {
    if (!syncStatus.autoSyncEnabled || !syncStatus.lastSyncTime) {
      return null;
    }

    const lastSync = new Date(syncStatus.lastSyncTime);
    const intervalMs = syncStatus.syncInterval * 60 * 1000;
    const nextSync = new Date(lastSync.getTime() + intervalMs);
    const now = new Date();
    
    if (nextSync <= now) {
      return 0; // Should sync now
    }
    
    return Math.ceil((nextSync - now) / 60000); // Minutes until next sync
  }, [syncStatus]);

  // Load initial data
  useEffect(() => {
    refreshSyncStatus();
    refreshSyncHistory();
  }, [refreshSyncStatus, refreshSyncHistory]);

  // Listen for sync events
  useEffect(() => {
    const handleSyncComplete = (event) => {
      refreshSyncStatus();
      refreshSyncHistory();
      setError(null);
    };

    const handleSyncError = (event) => {
      setError(event.detail.error);
      refreshSyncStatus();
      refreshSyncHistory();
    };

    const handleAuthError = () => {
      setError('Authentication required');
      refreshSyncStatus();
    };

    window.addEventListener('syncComplete', handleSyncComplete);
    window.addEventListener('syncError', handleSyncError);
    window.addEventListener('authError', handleAuthError);

    return () => {
      window.removeEventListener('syncComplete', handleSyncComplete);
      window.removeEventListener('syncError', handleSyncError);
      window.removeEventListener('authError', handleAuthError);
    };
  }, [refreshSyncStatus, refreshSyncHistory]);

  // Auto-refresh sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSyncStatus();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [refreshSyncStatus]);

  return {
    // Status
    syncStatus,
    syncHistory,
    loading,
    error,
    
    // Actions
    executeManualSync,
    startAutoSync,
    stopAutoSync,
    previewSync,
    refreshAllSyncedEvents,
    clearAllSyncedEvents,
    testSync,
    
    // Utils
    refreshSyncStatus,
    refreshSyncHistory,
    getSyncSuccessRate,
    getTimeUntilNextSync,
    
    // Computed values
    isAutoSyncActive: syncStatus.autoSyncEnabled,
    canSync: syncStatus.isAuthenticated && !syncStatus.syncInProgress,
    lastSyncTimeAgo: syncStatus.lastSyncTime ? 
      Math.floor((Date.now() - new Date(syncStatus.lastSyncTime)) / 60000) : null,
    nextSyncIn: getTimeUntilNextSync()
  };
}
