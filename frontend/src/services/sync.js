import apiClient from './api.js';
import DatabaseService from './db.js';

/**
 * Sync orchestrator for managing automatic and manual sync operations
 * Coordinates between API, database, and background sync
 */
class SyncService {
  constructor() {
    this.syncInProgress = false;
    this.autoSyncInterval = null;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastError: null
    };

    // Initialize sync worker if available
    this.syncWorker = null;
    this.initializeWorker();

    // Listen for auth changes
    window.addEventListener('authError', () => {
      this.stopAutoSync();
    });
  }

  /**
   * Initialize Web Worker for background sync
   */
  initializeWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        // For Vite, we need to use a different approach for workers
        this.syncWorker = new Worker(
          new URL('../workers/syncWorker.js', import.meta.url),
          { type: 'module' }
        );

        this.syncWorker.onmessage = (event) => {
          this.handleWorkerMessage(event.data);
        };

        this.syncWorker.onerror = (error) => {
          console.error('Sync worker error:', error);
          this.syncWorker = null; // Fallback to main thread
        };

        console.log('Sync worker initialized');
      } catch (error) {
        console.warn('Failed to initialize sync worker, using main thread:', error);
        this.syncWorker = null;
      }
    }
  }

  /**
   * Handle messages from sync worker
   */
  handleWorkerMessage(data) {
    switch (data.type) {
      case 'WORKER_READY':
        console.log('Sync worker is ready');
        break;
      case 'SYNC_TRIGGERED':
        this.executeManualSync();
        break;
      case 'AUTO_SYNC_STARTED':
        console.log('Auto-sync started in worker with interval:', data.interval);
        break;
      case 'AUTO_SYNC_STOPPED':
        console.log('Auto-sync stopped in worker');
        break;
      case 'CONFIG_UPDATED':
        console.log('Worker config updated');
        break;
      case 'SYNC_COMPLETE':
        this.handleSyncComplete(data.result);
        break;
      case 'SYNC_ERROR':
        this.handleSyncError(data.error);
        break;
      case 'WORKER_ERROR':
        console.error('Worker error:', data.error);
        break;
      default:
        console.warn('Unknown worker message:', data);
    }
  }

  /**
   * Start automatic sync based on user preferences
   */
  async startAutoSync() {
    try {
      const preferences = await DatabaseService.getPreferences();
      
      if (!preferences?.autoSyncEnabled) {
        console.log('Auto-sync is disabled');
        return false;
      }

      // Check authentication
      const isAuthenticated = await apiClient.checkAuthentication();
      if (!isAuthenticated) {
        console.log('Auto-sync requires authentication');
        return false;
      }

      // Stop existing interval
      this.stopAutoSync();

      const intervalMs = preferences.syncInterval * 60 * 1000; // Convert to milliseconds

      if (this.syncWorker) {
        // Use worker for background sync
        this.syncWorker.postMessage({
          type: 'START_AUTO_SYNC',
          interval: intervalMs
        });
      } else {
        // Fallback to setInterval
        this.autoSyncInterval = setInterval(() => {
          this.executeBackgroundSync();
        }, intervalMs);
      }

      console.log(`Auto-sync started with ${preferences.syncInterval} minute interval`);
      return true;
    } catch (error) {
      console.error('Failed to start auto-sync:', error);
      return false;
    }
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncWorker) {
      this.syncWorker.postMessage({ type: 'STOP_AUTO_SYNC' });
    }

    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }

    console.log('Auto-sync stopped');
  }

  /**
   * Execute manual sync (triggered by user)
   */
  async executeManualSync() {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { success: false, error: 'Sync already in progress' };
    }

    console.log('Executing manual sync...');
    return await this.performSync({ source: 'manual' });
  }

  /**
   * Execute background sync (triggered by timer)
   */
  async executeBackgroundSync() {
    if (this.syncInProgress) {
      console.log('Background sync skipped - sync in progress');
      return;
    }

    console.log('Executing background sync...');
    await this.performSync({ source: 'auto', background: true });
  }

  /**
   * Perform the actual sync operation
   */
  async performSync(options = {}) {
    this.syncInProgress = true;
    const syncStartTime = Date.now();

    try {
      // Get user preferences
      const preferences = await DatabaseService.getPreferences();
      if (!preferences) {
        throw new Error('No user preferences found');
      }

      // Check authentication
      const isAuthenticated = await apiClient.checkAuthentication();
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }

      // Get existing synced events
      const syncedEvents = await DatabaseService.getSyncedEvents();
      const existingEventIds = syncedEvents.map(e => e.eventId);

      // Execute sync on backend
      const result = await apiClient.executeSync(preferences, existingEventIds);

      if (!result.success) {
        throw new Error(result.error?.message || 'Sync failed on server');
      }

      // Process results
      const syncResult = await this.processSyncResults(result.data);

      // Update statistics
      this.updateSyncStats(true, syncResult);

      // Store sync history
      await DatabaseService.addSyncHistory('success', {
        ...syncResult.stats,
        source: options.source,
        duration: Date.now() - syncStartTime
      });

      this.lastSyncTime = new Date();

      // Update last sync time in preferences
      await DatabaseService.updatePreferences({
        lastSyncTime: this.lastSyncTime
      });

      // Emit sync complete event
      this.emitSyncEvent('syncComplete', syncResult);

      console.log('Sync completed successfully:', syncResult.stats);
      return { success: true, data: syncResult };

    } catch (error) {
      console.error('Sync failed:', error);

      // Update statistics
      this.updateSyncStats(false, null, error.message);

      // Store sync history
      await DatabaseService.addSyncHistory('error', {
        error: error.message,
        source: options.source,
        duration: Date.now() - syncStartTime
      });

      // Emit sync error event
      this.emitSyncEvent('syncError', { error: error.message });

      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process sync results and update local database
   */
  async processSyncResults(syncData) {
    const { newEvents, toRemove, stats } = syncData;
    
    const processed = {
      added: [],
      removed: [],
      failed: [],
      stats: stats
    };

    // Add new synced events to database
    for (const eventData of newEvents) {
      try {
        const syncedEvent = await DatabaseService.addSyncedEvent({
          eventId: eventData.eventId,
          googleCalendarEventId: eventData.googleEventId,
          title: eventData.title || 'Unknown Event',
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          teams: eventData.teams || [],
          organization: eventData.organization || 'Unknown',
          sport: eventData.sport || 'other',
          dataSource: eventData.dataSource || 'unknown',
          venue: eventData.venue || ''
        });
        
        processed.added.push(syncedEvent);
      } catch (error) {
        console.error('Failed to add synced event to database:', error);
        processed.failed.push({
          eventId: eventData.eventId,
          error: error.message
        });
      }
    }

    // Remove events that no longer match
    for (const eventId of toRemove) {
      try {
        const syncedEvent = await DatabaseService.getSyncedEventByEventId(eventId);
        if (syncedEvent) {
          await DatabaseService.removeSyncedEvent(syncedEvent.id);
          processed.removed.push(syncedEvent);
        }
      } catch (error) {
        console.error('Failed to remove synced event from database:', error);
        processed.failed.push({
          eventId: eventId,
          error: error.message
        });
      }
    }

    return processed;
  }

  /**
   * Update sync statistics
   */
  updateSyncStats(success, result, error = null) {
    this.syncStats.totalSyncs++;
    
    if (success) {
      this.syncStats.successfulSyncs++;
      this.syncStats.lastError = null;
    } else {
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error;
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus() {
    const preferences = await DatabaseService.getPreferences();
    const syncedEventsCount = await DatabaseService.getSyncedEvents();
    const isAuthenticated = await apiClient.checkAuthentication();

    return {
      autoSyncEnabled: preferences?.autoSyncEnabled || false,
      syncInterval: preferences?.syncInterval || 60,
      lastSyncTime: this.lastSyncTime || preferences?.lastSyncTime,
      syncedEventsCount: syncedEventsCount.length,
      syncInProgress: this.syncInProgress,
      isAuthenticated: isAuthenticated,
      stats: this.syncStats,
      workerAvailable: !!this.syncWorker
    };
  }

  /**
   * Preview sync changes without executing
   */
  async previewSync() {
    try {
      const preferences = await DatabaseService.getPreferences();
      if (!preferences) {
        throw new Error('No user preferences found');
      }

      const syncedEvents = await DatabaseService.getSyncedEvents();
      const existingEventIds = syncedEvents.map(e => e.eventId);

      const result = await apiClient.previewSync(preferences, existingEventIds);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Preview failed');
      }

      return result.data;
    } catch (error) {
      console.error('Sync preview failed:', error);
      throw error;
    }
  }

  /**
   * Force refresh all synced events
   */
  async refreshAllSyncedEvents() {
    try {
      console.log('Refreshing all synced events...');
      
      // Get all active synced events
      const syncedEvents = await DatabaseService.getSyncedEvents();
      
      // Mark all as removed (they'll be re-added if they still match)
      for (const event of syncedEvents) {
        await DatabaseService.removeSyncedEvent(event.id);
      }

      // Execute sync to re-populate
      const result = await this.executeManualSync();
      
      console.log('Refresh completed');
      return result;
    } catch (error) {
      console.error('Failed to refresh synced events:', error);
      throw error;
    }
  }

  /**
   * Clear all synced events
   */
  async clearAllSyncedEvents() {
    try {
      const syncedEvents = await DatabaseService.getSyncedEvents();
      
      // Remove from Google Calendar
      if (syncedEvents.length > 0) {
        const googleEventIds = syncedEvents
          .map(e => e.googleCalendarEventId)
          .filter(Boolean);
        
        if (googleEventIds.length > 0) {
          await apiClient.removeBatchFromCalendar(googleEventIds);
        }
      }

      // Clear from local database
      await DatabaseService.syncedEvents.where('status').equals('active').delete();
      
      console.log(`Cleared ${syncedEvents.length} synced events`);
      return { success: true, count: syncedEvents.length };
    } catch (error) {
      console.error('Failed to clear synced events:', error);
      throw error;
    }
  }

  /**
   * Emit sync-related events
   */
  emitSyncEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, { 
      detail: data 
    }));
  }

  /**
   * Handle sync completion from worker or manual sync
   */
  handleSyncComplete(result) {
    console.log('Sync completed:', result);
    this.emitSyncEvent('syncComplete', result);
  }

  /**
   * Handle sync errors
   */
  handleSyncError(error) {
    console.error('Sync error:', error);
    this.emitSyncEvent('syncError', { error });
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit = 20) {
    return await DatabaseService.getSyncHistory(limit);
  }

  /**
   * Test sync functionality
   */
  async testSync() {
    try {
      const result = await apiClient.testSync();
      console.log('Sync test result:', result);
      return result;
    } catch (error) {
      console.error('Sync test failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopAutoSync();
    
    if (this.syncWorker) {
      this.syncWorker.terminate();
      this.syncWorker = null;
    }
  }
}

// Create and export singleton instance
const syncService = new SyncService();
export default syncService;
