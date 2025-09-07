import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import { Google } from '@mui/icons-material';
import { useApp } from '../contexts/AppContext.jsx';
import apiService from '../services/api.js';

/**
 * Authentication page component
 * Handles Google OAuth flow and user authentication
 */
function AuthPage() {
  const { auth, addNotification } = useApp();

  // Redirect if already authenticated
  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Handle authentication initiation
  const handleSignIn = async () => {
    try {
      await auth.initiateAuth();
      addNotification({
        type: 'success',
        title: 'Authentication Successful',
        message: 'Successfully connected to Google Calendar'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Authentication Failed',
        message: error.message || 'Failed to authenticate with Google'
      });
    }
  };

  // Handle OAuth callback (if URL contains tokens, code or success/error params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokens = urlParams.get('tokens');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const code = urlParams.get('code');
    
    const handleAuthResult = async () => {
      if (success === 'true' && tokens) {
        // New redirect flow with tokens
        try {
          console.log('🔄 Processing tokens from redirect...');
          
          // Use a more robust decoding approach
          let decodedTokens;
          try {
            // First decode the URL component
            const urlDecoded = decodeURIComponent(tokens);
            // Then decode base64
            const base64Decoded = window.atob(urlDecoded);
            // Finally parse JSON
            decodedTokens = JSON.parse(base64Decoded);
          } catch (decodeError) {
            console.error('Token decoding error:', decodeError);
            throw new Error('Invalid token format received');
          }
          
          console.log('🔐 Decoded tokens:', decodedTokens);
          
          // Store tokens and update auth state
          await apiService.storeTokens(decodedTokens);
          
          // Clear URL params
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, '', newUrl);
          
          addNotification({
            type: 'success',
            title: 'Authentication Successful',
            message: 'Successfully authenticated with Google Calendar'
          });
          
        } catch (err) {
          console.error('❌ Error processing auth redirect:', err);
          addNotification({
            type: 'error',
            title: 'Authentication Error',
            message: 'Failed to process authentication result'
          });
        }
      } else if (error) {
        // Handle error from redirect
        console.error('❌ Auth error from redirect:', error);
        addNotification({
          type: 'error',
          title: 'Authentication Failed',
          message: decodeURIComponent(error)
        });
        
        // Clear URL params
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      } else if (code) {
        // Handle legacy callback with authorization code
        console.log('🔄 Processing authorization code...');
        auth.handleCallback(code);
      }
    };

    handleAuthResult();
  }, [auth, addNotification]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Stack spacing={3}>
            {/* Logo/Title */}
            <Box>
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                Sports Calendar
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Connect your Google Calendar to sync sports events
              </Typography>
            </Box>

            {/* Features */}
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                Features
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  ✓ Automatically sync sports events to your Google Calendar
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ✓ Filter events by teams, leagues, and sports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ✓ Real-time updates and notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ✓ Secure authentication with Google
                </Typography>
              </Stack>
            </Box>

            {/* Authentication Section */}
            <Box>
              {auth.loading ? (
                <Stack spacing={2} alignItems="center">
                  <CircularProgress />
                  <Typography color="text.secondary">
                    Authenticating...
                  </Typography>
                </Stack>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Google />}
                  onClick={handleSignIn}
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                  }}
                >
                  Sign in with Google
                </Button>
              )}
            </Box>

            {/* Privacy Notice */}
            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <Typography variant="caption">
                We only access your Google Calendar to sync sports events. 
                Your data is secure and we never store personal information.
              </Typography>
            </Alert>

            {/* Additional Info */}
            <Typography variant="caption" color="text.secondary">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default AuthPage;
