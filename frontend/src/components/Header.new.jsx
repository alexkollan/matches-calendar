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
          <Box>
            <Typography variant="h6" component="h1">
              {pageInfo.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pageInfo.subtitle}
            </Typography>
          </Box>
        </Stack>

        {/* Status Indicators */}
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* Error Banner */}
          {state.ui.error && (
            <Alert
              severity="error"
              variant="outlined"
              onClose={clearError}
              sx={{ py: 0 }}
            >
              {state.ui.error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {state.ui.loading && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Loading...
              </Typography>
            </Stack>
          )}

          {/* Sync Status */}
          {sync.syncStatus.syncInProgress && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={16} color="success" />
              <Typography variant="caption" color="success.main">
                Syncing...
              </Typography>
            </Stack>
          )}

          {/* Auth Status */}
          <Chip
            size="small"
            variant="outlined"
            color={auth.isAuthenticated ? 'success' : 'error'}
            label={auth.isAuthenticated 
              ? auth.user?.email?.split('@')[0] || 'Connected'
              : 'Not connected'
            }
          />

          {/* Quick Actions */}
          {auth.isAuthenticated && (
            <Stack direction="row" spacing={1}>
              {/* Sync Button */}
              <IconButton
                onClick={sync.executeManualSync}
                disabled={sync.loading || !sync.canSync}
                title="Manual sync"
                size="small"
              >
                <Refresh />
              </IconButton>

              {/* Sign Out Button */}
              <IconButton
                onClick={auth.signOut}
                title="Sign out"
                size="small"
              >
                <Logout />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
