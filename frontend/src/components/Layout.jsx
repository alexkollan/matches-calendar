import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Main layout component
 * Provides the app shell with sidebar, header, and main content area
 */
const Layout = memo(function Layout({ children }) {
  const { state } = useApp();

  // Memoize styles to prevent re-creation on every render
  const mainBoxStyles = useMemo(() => ({
    flexGrow: 1,
    transition: 'margin-left 0.3s ease',
    marginLeft: state.ui.sidebarOpen ? '256px' : '64px',
  }), [state.ui.sidebarOpen]);

  const contentBoxStyles = useMemo(() => ({
    p: 3
  }), []);

  return (
    <Box minHeight="100vh" display="flex">
      <Sidebar />
      
      <Box sx={mainBoxStyles}>
        <Header />
        
        <Box component="main" sx={contentBoxStyles}>
          {children}
        </Box>
      </Box>
    </Box>
  );
});

export default Layout;
