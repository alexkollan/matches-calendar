import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Navigation sidebar component
 * Provides app navigation and quick actions
 */
function Sidebar() {
  const { state, auth, sync, toggleSidebar } = useApp();
  const location = useLocation();
  
  const navItems = [
    { 
      path: '/events', 
      label: 'Events', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: 'View sports events'
    },
    { 
      path: '/calendar', 
      label: 'Calendar', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Calendar integration'
    },
    { 
      path: '/sync', 
      label: 'Sync', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      description: 'Sync management'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'App preferences'
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`fixed left-0 top-0 h-full bg-surface border-r border-border transition-all duration-300 z-40 ${
      state.ui.sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className={`font-bold text-text-primary transition-all duration-300 ${
            state.ui.sidebarOpen ? 'text-xl' : 'text-0 w-0 overflow-hidden'
          }`}>
            Sports Calendar
          </h1>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-default hover:bg-gray-800 transition-colors text-text-secondary hover:text-text-primary"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={state.ui.sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        </div>
        
        {state.ui.sidebarOpen && (
          <div className="mt-4 p-3 bg-background rounded-default border border-border">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                auth.isAuthenticated ? 'bg-success' : 'bg-accent'
              }`}></div>
              <span className="text-sm text-text-secondary">
                {auth.isAuthenticated ? 'Connected' : 'Not connected'}
              </span>
            </div>
            
            {auth.isAuthenticated && (
              <div className="mt-2 text-xs text-text-secondary">
                {auth.user?.email || 'Signed in'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-default transition-all duration-200 group ${
              isActive(item.path) 
                ? 'bg-accent text-white shadow-app' 
                : 'text-text-secondary hover:text-text-primary hover:bg-gray-800'
            }`}
            title={state.ui.sidebarOpen ? '' : item.description}
          >
            <span className={`${isActive(item.path) ? 'text-white' : ''}`}>
              {item.icon}
            </span>
            {state.ui.sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className={`text-xs ${
                  isActive(item.path) ? 'text-red-100' : 'text-text-secondary'
                }`}>
                  {item.description}
                </span>
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Sync Status */}
      {state.ui.sidebarOpen && auth.isAuthenticated && (
        <div className="mx-4 mb-4 p-4 bg-background rounded-default border border-border">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Sync Status
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Auto-sync</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                sync.isAutoSyncActive 
                  ? 'bg-success/20 text-success' 
                  : 'bg-gray-800 text-text-secondary'
              }`}>
                {sync.isAutoSyncActive ? 'ON' : 'OFF'}
              </span>
            </div>
            
            {sync.lastSyncTimeAgo !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Last sync</span>
                <span className="text-text-primary">
                  {sync.lastSyncTimeAgo === 0 ? 'Just now' : `${sync.lastSyncTimeAgo}m ago`}
                </span>
              </div>
            )}
            
            {sync.nextSyncIn !== null && sync.isAutoSyncActive && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Next sync</span>
                <span className="text-text-primary">
                  {sync.nextSyncIn === 0 ? 'Now' : `${sync.nextSyncIn}m`}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3">
            <button
              onClick={sync.executeManualSync}
              disabled={sync.loading || !sync.canSync}
              className="btn-primary w-full text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sync.loading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {state.ui.sidebarOpen && (
        <div className="mx-4 mb-4 p-4 bg-background rounded-default border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">{state.data.events.length}</div>
              <div className="text-xs text-text-secondary">Events</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">{state.preferences.selectedTeams.length}</div>
              <div className="text-xs text-text-secondary">Teams</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">{sync.syncStatus.syncedEventsCount}</div>
              <div className="text-xs text-text-secondary">Synced</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">{sync.getSyncSuccessRate()}%</div>
              <div className="text-xs text-text-secondary">Success</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
