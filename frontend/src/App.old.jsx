import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { theme } from './theme.js';
import { AppProvider } from './contexts/AppContext.jsx';
import Layout from './components/Layout.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import SyncPage from './pages/SyncPage.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { useApp } from './contexts/AppContext.jsx';

/**
 * Protected route component
 * Redirects to auth page if not authenticated
 */
function ProtectedRoute({ children }) {
  const { auth } = useApp();
  
  if (auth.loading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress size={48} />
      </Box>
    );
  }
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
}

/**
 * App routes component
 * Handles routing logic after context is available
 */
function AppRoutes() {
  const { auth, isReady } = useApp();
  
  // Show loading screen while app initializes
  if (!isReady && auth.isAuthenticated) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Box textAlign="center">
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading application...</Typography>
        </Box>
      </Box>
    );
  }
  
  return (
    <Routes>
      {/* Public route */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <EventsPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/events" element={
        <ProtectedRoute>
          <Layout>
            <EventsPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/calendar" element={
        <ProtectedRoute>
          <Layout>
            <CalendarPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/sync" element={
        <ProtectedRoute>
          <Layout>
            <SyncPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout>
            <SettingsPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Main App component
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppProvider>
          <AppRoutes />
          <ToastContainer />
        </AppProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
