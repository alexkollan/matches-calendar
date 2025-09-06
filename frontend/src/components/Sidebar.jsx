import React from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton,
  IconButton,
  Typography,
  Box,
  Divider,
  Collapse,
  Chip
} from '@mui/material';
import {
  CalendarToday,
  Schedule,
  Sync,
  Settings,
  Menu,
  ExpandLess,
  ExpandMore,
  Sports,
  SportsFootball,
  SportsSoccer,
  SportsBasketball
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Navigation sidebar component
 * Provides app navigation and quick actions
 */
function Sidebar() {
  const { state, auth, sync, toggleSidebar } = useApp();
  const location = useLocation();
  const [leaguesOpen, setLeaguesOpen] = React.useState(false);
  
  const navItems = [
    { 
      path: '/events', 
      label: 'Events', 
      icon: <CalendarToday />,
      description: 'View sports events'
    },
    { 
      path: '/calendar', 
      label: 'Calendar', 
      icon: <Schedule />,
      description: 'Calendar integration'
    },
    { 
      path: '/sync', 
      label: 'Sync', 
      icon: <Sync />,
      description: 'Sync management'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: <Settings />,
      description: 'Configure app preferences'
    }
  ];

  const isActiveRoute = (path) => {
    if (path === '/events') {
      return location.pathname === '/' || location.pathname === '/events';
    }
    return location.pathname === path;
  };

  const drawerWidth = state.ui.sidebarOpen ? 256 : 64;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden'
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: state.ui.sidebarOpen ? 'space-between' : 'center'
        }}
      >
        {state.ui.sidebarOpen && (
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Sports Calendar
          </Typography>
        )}
        <IconButton onClick={toggleSidebar} size="small">
          <Menu />
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isActiveRoute(item.path)}
              sx={{
                borderRadius: 1,
                minHeight: 48,
                justifyContent: state.ui.sidebarOpen ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: state.ui.sidebarOpen ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {state.ui.sidebarOpen && (
                <ListItemText 
                  primary={item.label} 
                  secondary={item.description}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}

        {/* Sports/Leagues Section */}
        {state.ui.sidebarOpen && auth.isAuthenticated && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <ListItem disablePadding>
              <ListItemButton onClick={() => setLeaguesOpen(!leaguesOpen)}>
                <ListItemIcon>
                  <Sports />
                </ListItemIcon>
                <ListItemText primary="Sports" />
                {leaguesOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            
            <Collapse in={leaguesOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {(state.preferences.selectedLeagues || []).map((league) => (
                  <ListItem key={league.id || league} sx={{ pl: 4 }} disablePadding>
                    <ListItemButton>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {(typeof league === 'object' ? league.sport : 'unknown') === 'football' && <SportsFootball fontSize="small" />}
                        {(typeof league === 'object' ? league.sport : 'unknown') === 'soccer' && <SportsSoccer fontSize="small" />}
                        {(typeof league === 'object' ? league.sport : 'unknown') === 'basketball' && <SportsBasketball fontSize="small" />}
                        {!['football', 'soccer', 'basketball'].includes(typeof league === 'object' ? league.sport : 'unknown') && <Sports fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={typeof league === 'object' ? league.name : league}
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
      </List>

      {/* Status Footer */}
      {state.ui.sidebarOpen && (
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          
          {/* Connection Status */}
          <Box sx={{ mb: 1 }}>
            <Chip
              size="small"
              variant="outlined"
              color={auth.isAuthenticated ? 'success' : 'error'}
              label={auth.isAuthenticated ? 'Connected' : 'Disconnected'}
              sx={{ width: '100%' }}
            />
          </Box>

          {/* Sync Status */}
          {auth.isAuthenticated && (
            <Box>
              <Chip
                size="small"
                variant="outlined"
                color={sync.syncStatus.syncInProgress ? 'info' : 'default'}
                label={sync.syncStatus.syncInProgress ? 'Syncing...' : 'Sync Ready'}
                sx={{ width: '100%' }}
              />
            </Box>
          )}
        </Box>
      )}
    </Drawer>
  );
}

export default Sidebar;
