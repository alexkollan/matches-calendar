import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Main layout component
 * Provides the app shell with sidebar, header, and main content area
 */
function Layout({ children }) {
  const { state } = useApp();

  return (
    <Box minHeight="100vh" display="flex">
      <Sidebar />
      
      <Box
        sx={{
          flexGrow: 1,
          transition: 'margin-left 0.3s ease',
          marginLeft: state.ui.sidebarOpen ? '256px' : '64px',
        }}
      >
        <Header />
        
        <Box component="main" p={3}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
