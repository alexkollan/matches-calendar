import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  Alert, 
  Chip, 
  CircularProgress,
  Stack
} from '@mui/material';
import {
  CalendarToday,
  Schedule,
  Sync,
  Settings,
  Dashboard,
  Warning,
  Close,
  Refresh,
  Logout
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Header component
 * Shows current page info, user status, and quick actions
 */
function Header() {
  const { auth, state, sync, clearError } = useApp();
  const location = useLocation();

  // Get page info based on current route
  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
      case '/events':
        return {
          title: 'Sports Events',
          subtitle: 'View and manage your sports events',
          icon: <CalendarToday />
        };
      case '/calendar':
        return {
          title: 'Calendar Integration',
          subtitle: 'Manage Google Calendar sync',
          icon: <Schedule />
        };
      case '/sync':
        return {
          title: 'Sync Management',
          subtitle: 'Control data synchronization',
          icon: <Sync />
        };
      case '/settings':
        return {
          title: 'Settings',
          subtitle: 'Configure app preferences',
          icon: <Settings />
        };
      default:
        return {
          title: 'Sports Calendar',
          subtitle: 'Welcome',
          icon: <Dashboard />
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        {/* Page Info */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
          <Box color="primary.main">{pageInfo.icon}</Box>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">{pageInfo.title}</h1>
              <p className="text-sm text-text-secondary">{pageInfo.subtitle}</p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {/* Error Banner */}
            {state.ui.error && (
              <div className="flex items-center gap-2 bg-accent/20 text-accent border border-accent/30 rounded-default px-3 py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm">{state.ui.error}</span>
                <button
                  onClick={clearError}
                  className="text-accent/70 hover:text-accent ml-2 p-1 rounded-md hover:bg-accent/10"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {state.ui.loading && (
              <div className="flex items-center gap-2 text-text-secondary">
                <div className="loading-spinner w-4 h-4 border-2 border-text-secondary border-t-accent rounded-full"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}

            {/* Sync Status */}
            {sync.syncStatus.syncInProgress && (
              <div className="flex items-center gap-2 text-success">
                <div className="loading-spinner w-4 h-4 border-2 border-success/30 border-t-success rounded-full"></div>
                <span className="text-sm">Syncing...</span>
              </div>
            )}

            {/* Auth Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                auth.isAuthenticated ? 'bg-success' : 'bg-accent'
              }`}></div>
              <span className="text-sm text-text-secondary">
                {auth.isAuthenticated 
                  ? auth.user?.email?.split('@')[0] || 'Connected'
                  : 'Not connected'
                }
              </span>
            </div>

            {/* Quick Actions */}
            {auth.isAuthenticated && (
              <div className="flex items-center gap-2">
                {/* Sync Button */}
                <button
                  onClick={sync.executeManualSync}
                  disabled={sync.loading || !sync.canSync}
                  className="p-2 rounded-default bg-gray-800 hover:bg-gray-700 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Manual sync"
                >
                  <svg className={`w-4 h-4 ${sync.loading ? 'loading-spinner' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={auth.signOut}
                  className="p-2 rounded-default bg-gray-800 hover:bg-gray-700 text-text-secondary hover:text-accent transition-colors"
                  title="Sign out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
