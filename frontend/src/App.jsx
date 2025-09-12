import React, { Profiler, memo, useMemo } from 'react';
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

// Performance profiler callback (dev-only)
const isDev = (typeof import.meta !== 'undefined' && import.meta?.env?.MODE !== 'production')
  || (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production');

const SLOW_RENDER_THRESHOLD = Number(
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SLOW_RENDER_THRESHOLD)
  ?? (typeof process !== 'undefined' && process?.env?.VITE_SLOW_RENDER_THRESHOLD)
  ?? 200
);

const onRenderCallback = (id, phase, actualDuration) => {
  if (!isDev) return;
  if (actualDuration > SLOW_RENDER_THRESHOLD) {
    // Use debug to reduce noise vs warn
    console.debug(`🐌 Slow render detected: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
  }
};

/**
 * Protected route component
 * Redirects to auth page if not authenticated
 */
const ProtectedRoute = memo(function ProtectedRoute({ children }) {
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
});

/**
 * App routes component
 * Handles routing logic after context is available
 */
const AppRoutes = memo(function AppRoutes() {
  const { auth, isReady } = useApp();
  
  // Memoize loading screen to prevent re-renders
  const loadingScreen = useMemo(() => (
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
  ), []);
  
  // Show loading screen while app initializes
  if (!isReady && auth.isAuthenticated) {
    return loadingScreen;
  }
  
  // Memoize routes to prevent re-creation on every render
  const routes = useMemo(() => (
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
  ), []);
  
  return routes;
});

/**
 * Main App component
 */
function App() {
  const routed = (
    <Profiler id="AppRoutes" onRender={onRenderCallback}>
      <AppRoutes />
    </Profiler>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppProvider>
          {isDev ? routed : <AppRoutes />}
          <ToastContainer />
        </AppProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
