import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Sync management page component
 * Provides sync controls, status, and history
 */
function SyncPage() {
  const { 
    auth, 
    sync, 
    events, 
    addNotification 
  } = useApp();

  const [previewData, setPreviewData] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Handle sync preview
  const handlePreviewSync = async () => {
    try {
      const preview = await sync.previewSync();
      setPreviewData(preview);
      addNotification({
        type: 'info',
        title: 'Sync Preview Ready',
        message: `Found ${preview.newEvents} new events and ${preview.updatedEvents} updates`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Preview Failed',
        message: error.message
      });
    }
  };

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      const result = await sync.executeManualSync();
      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Sync Completed',
          message: `Synced ${result.eventsProcessed} events successfully`
        });
        setPreviewData(null);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: error.message
      });
    }
  };

  // Handle auto-sync toggle
  const handleAutoSyncToggle = async () => {
    try {
      if (sync.isAutoSyncActive) {
        sync.stopAutoSync();
        addNotification({
          type: 'info',
          title: 'Auto-sync Disabled',
          message: 'Automatic synchronization has been stopped'
        });
      } else {
        const started = await sync.startAutoSync();
        if (started) {
          addNotification({
            type: 'success',
            title: 'Auto-sync Enabled',
            message: 'Automatic synchronization has been started'
          });
        }
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Auto-sync Error',
        message: error.message
      });
    }
  };

  // Handle test sync
  const handleTestSync = async () => {
    try {
      const result = await sync.testSync();
      addNotification({
        type: result.success ? 'success' : 'error',
        title: 'Sync Test',
        message: result.message
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Test Failed',
        message: error.message
      });
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            Authentication Required
          </h2>
          <p className="text-text-secondary">
            Please sign in to access sync management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-primary mb-2">
          Sync Management
        </h1>
        <p className="text-text-secondary">
          Manage calendar synchronization, view sync status, and control automation settings.
        </p>
      </div>

      {/* Sync Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Sync Status</h3>
            <div className={`w-3 h-3 rounded-full ${sync.isAutoSyncActive ? 'bg-success' : 'bg-error'}`}></div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Auto-sync:</span>
              <span className="text-text-primary font-medium">
                {sync.isAutoSyncActive ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Last sync:</span>
              <span className="text-text-primary font-medium">
                {sync.lastSyncTimeAgo !== null 
                  ? `${sync.lastSyncTimeAgo}m ago` 
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Next sync:</span>
              <span className="text-text-primary font-medium">
                {sync.nextSyncIn !== null && sync.isAutoSyncActive
                  ? `${sync.nextSyncIn}m`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Statistics</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total events:</span>
              <span className="text-text-primary font-medium">{events.events.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Synced:</span>
              <span className="text-success font-medium">
                {events.events.filter(e => e.calendarEventId).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Pending:</span>
              <span className="text-orange-400 font-medium">
                {events.events.filter(e => !e.calendarEventId).length}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Success Rate</h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-2">
              {sync.getSyncSuccessRate()}%
            </div>
            <div className="text-sm text-text-secondary">
              Overall sync success
            </div>
          </div>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Sync Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handlePreviewSync}
            disabled={sync.isSyncing}
            className="btn-secondary"
          >
            Preview Sync
          </button>
          
          <button
            onClick={handleManualSync}
            disabled={sync.isSyncing}
            className="btn-primary"
          >
            {sync.isSyncing ? 'Syncing...' : 'Manual Sync'}
          </button>
          
          <button
            onClick={handleAutoSyncToggle}
            disabled={sync.isSyncing}
            className={sync.isAutoSyncActive ? 'btn-error' : 'btn-success'}
          >
            {sync.isAutoSyncActive ? 'Disable Auto-sync' : 'Enable Auto-sync'}
          </button>
          
          <button
            onClick={handleTestSync}
            disabled={sync.isSyncing}
            className="btn-secondary"
          >
            Test Connection
          </button>
        </div>
      </div>

      {/* Preview Data */}
      {previewData && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Sync Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-background rounded-default p-4 border border-border">
              <div className="text-2xl font-bold text-blue-400 mb-1">{previewData.newEvents}</div>
              <div className="text-sm text-text-secondary">New Events</div>
            </div>
            <div className="bg-background rounded-default p-4 border border-border">
              <div className="text-2xl font-bold text-success mb-1">{previewData.updatedEvents}</div>
              <div className="text-sm text-text-secondary">Updated Events</div>
            </div>
            <div className="bg-background rounded-default p-4 border border-border">
              <div className="text-2xl font-bold text-orange-400 mb-1">{previewData.removedEvents}</div>
              <div className="text-sm text-text-secondary">Removed Events</div>
            </div>
          </div>
          <button
            onClick={() => setPreviewData(null)}
            className="btn-secondary text-sm"
          >
            Clear Preview
          </button>
        </div>
      )}

      {/* Sync History */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary">Sync History</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary text-sm"
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>
        
        {showHistory && (
          <div className="space-y-3">
            {sync.syncHistory && sync.syncHistory.length > 0 ? (
              sync.syncHistory.slice(0, 10).map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      entry.success ? 'bg-success' : 'bg-error'
                    }`}></div>
                    <div>
                      <div className="text-sm text-text-primary font-medium">
                        {entry.success ? 'Successful' : 'Failed'} sync
                      </div>
                      <div className="text-xs text-text-secondary">
                        {entry.eventsProcessed || 0} events processed
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-secondary">
                No sync history available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncPage;
