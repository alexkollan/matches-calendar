/**
 * Web Worker for background sync operations
 * Handles automatic sync scheduling without blocking the main thread
 */

let autoSyncInterval = null;
let syncConfig = null;

// Handle messages from main thread
self.onmessage = function(event) {
  const { type, ...data } = event.data;

  switch (type) {
    case 'START_AUTO_SYNC':
      startAutoSync(data.interval);
      break;
    
    case 'STOP_AUTO_SYNC':
      stopAutoSync();
      break;
    
    case 'UPDATE_CONFIG':
      updateSyncConfig(data.config);
      break;
    
    case 'TRIGGER_SYNC':
      triggerSync();
      break;
    
    default:
      console.warn('Unknown message type:', type);
  }
};

/**
 * Start automatic sync with specified interval
 */
function startAutoSync(interval) {
  console.log('Worker: Starting auto-sync with interval:', interval);
  
  // Clear existing interval
  stopAutoSync();
  
  // Set new interval
  autoSyncInterval = setInterval(() => {
    triggerSync();
  }, interval);
  
  // Send confirmation to main thread
  self.postMessage({
    type: 'AUTO_SYNC_STARTED',
    interval: interval
  });
}

/**
 * Stop automatic sync
 */
function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    
    self.postMessage({
      type: 'AUTO_SYNC_STOPPED'
    });
  }
}

/**
 * Update sync configuration
 */
function updateSyncConfig(config) {
  syncConfig = config;
  
  self.postMessage({
    type: 'CONFIG_UPDATED',
    config: config
  });
}

/**
 * Trigger a sync operation
 */
function triggerSync() {
  console.log('Worker: Triggering sync');
  
  self.postMessage({
    type: 'SYNC_TRIGGERED',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle errors
 */
self.onerror = function(error) {
  console.error('Worker error:', error);
  
  self.postMessage({
    type: 'WORKER_ERROR',
    error: {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno
    }
  });
};

// Send ready message
self.postMessage({
  type: 'WORKER_READY',
  timestamp: new Date().toISOString()
});
