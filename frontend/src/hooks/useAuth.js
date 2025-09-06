import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/api.js';

/**
 * Hook for managing authentication state
 * Provides Google Calendar authentication flow and token management
 */
export function useAuth() {
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    user: null,
    tokenExpiry: null,
    scopes: [],
    loading: true
  });

  const [error, setError] = useState(null);
  const hasCheckedAuth = useRef(false);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      console.log('Checking auth status...');
      
      // First check local tokens to avoid unnecessary API calls
      const localTokens = await apiService.getStoredTokens();
      
      // If no local tokens, we're definitely not authenticated
      if (!localTokens || !localTokens.accessToken) {
        setAuthStatus({
          isAuthenticated: false,
          user: null,
          loading: false,
          tokenExpiry: null,
          scopes: []
        });
        return { isAuthenticated: false };
      }

      // Only make backend call if we have local tokens
      const backendResponse = await apiService.getAuthStatus();
      const backendStatus = backendResponse.data || backendResponse;
      
      console.log('Backend auth status:', backendStatus);
      console.log('Local tokens found:', !!localTokens);
      
      // Frontend is authenticated if we have valid local tokens
      const isAuthenticated = !!(localTokens && localTokens.accessToken);
      
      setAuthStatus({
        isAuthenticated,
        user: backendStatus.user || null,
        tokenExpiry: localTokens?.expiryDate || null,
        scopes: backendStatus.scopes || [],
        loading: false,
        backendAuthenticated: backendStatus.authenticated || false
      });
      setError(null);
      hasCheckedAuth.current = true;
      
      return { 
        authenticated: isAuthenticated,
        backendAuthenticated: backendStatus.authenticated || false,
        hasLocalTokens: !!localTokens
      };
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setAuthStatus(prev => ({ ...prev, loading: false }));
      setError(err.message);
      return { authenticated: false, backendAuthenticated: false, hasLocalTokens: false };
    }
  }, []);

  // Initiate Google OAuth flow (redirect-based instead of popup)
  const initiateAuth = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.getGoogleAuthUrl();
      
      if (response.success && response.data.authUrl) {
        // Store current page for redirect back
        sessionStorage.setItem('auth_return_url', window.location.pathname);
        
        // Use full window redirect instead of popup
        console.log('🔄 Redirecting to Google OAuth...');
        window.location.href = response.data.authUrl;
        
        return true; // Will redirect, so this won't be reached
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (err) {
      console.error('Auth initiation failed:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Handle OAuth callback (for popup flow)
  const handleAuthCallback = useCallback(async (code) => {
    try {
      setError(null);
      const response = await apiService.handleGoogleCallback(code);
      
      if (response.success) {
        await checkAuthStatus();
        return true;
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth callback failed:', err);
      setError(err.message);
      throw err;
    }
  }, [checkAuthStatus]);

  // Refresh access token
  const refreshToken = useCallback(async () => {
    try {
      setError(null);
      const refreshed = await apiService.refreshTokens();
      
      if (refreshed) {
        await checkAuthStatus();
        return true;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      setError(err.message);
      
      // If refresh fails, user needs to re-authenticate
      setAuthStatus(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        tokenExpiry: null
      }));
      
      throw err;
    }
  }, [checkAuthStatus]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setError(null);
      await apiService.logout();
      
      setAuthStatus({
        isAuthenticated: false,
        user: null,
        tokenExpiry: null,
        scopes: [],
        loading: false
      });
      
      // Clear any cached data
      window.dispatchEvent(new CustomEvent('authSignOut'));
      
      return true;
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err.message);
      
      // Even if API call fails, clear local auth state
      setAuthStatus({
        isAuthenticated: false,
        user: null,
        tokenExpiry: null,
        scopes: [],
        loading: false
      });
      
      return false;
    }
  }, []);

  // Test authentication (verify token is valid)
  const testAuth = useCallback(async () => {
    try {
      setError(null);
      const valid = await apiService.validateTokens();
      return valid;
    } catch (err) {
      console.error('Auth test failed:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // Check if token is about to expire (within 5 minutes)
  const isTokenExpiringSoon = useCallback(() => {
    if (!authStatus.tokenExpiry) return false;
    
    const expiryTime = new Date(authStatus.tokenExpiry);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    return expiryTime <= fiveMinutesFromNow;
  }, [authStatus.tokenExpiry]);

  // Auto-refresh token if it's expiring soon
  useEffect(() => {
    if (authStatus.isAuthenticated && isTokenExpiringSoon()) {
      refreshToken().catch(() => {
        // Token refresh failed, handled in refreshToken function
      });
    }
  }, [authStatus.isAuthenticated, isTokenExpiringSoon, refreshToken]);

  // Check auth status on mount and check for localStorage fallback
  useEffect(() => {
    const initializeAuth = async () => {
      // Check for localStorage fallback tokens first
      try {
        const authSuccess = localStorage.getItem('google_auth_success');
        const storedTokens = localStorage.getItem('google_auth_tokens');
        
        if (authSuccess === 'true' && storedTokens) {
          console.log('🔄 Found auth tokens in localStorage fallback');
          const tokens = JSON.parse(storedTokens);
          
          // Store tokens properly in IndexedDB
          await apiService.storeTokens(tokens);
          console.log('✅ Moved tokens from localStorage to IndexedDB');
          
          // Clean up localStorage
          localStorage.removeItem('google_auth_success');
          localStorage.removeItem('google_auth_tokens');
        }
      } catch (error) {
        console.error('Error checking localStorage fallback:', error);
      }
      
      // Now check normal auth status
      await checkAuthStatus();
    };
    
    initializeAuth();
  }, [checkAuthStatus]);

  // Listen for auth events from other parts of the app
  useEffect(() => {
    const handleAuthRequired = () => {
      if (!authStatus.isAuthenticated) {
        setError('Authentication required');
      }
    };

    const handleTokenExpired = () => {
      refreshToken().catch(() => {
        setError('Session expired. Please sign in again.');
      });
    };

    window.addEventListener('authRequired', handleAuthRequired);
    window.addEventListener('tokenExpired', handleTokenExpired);

    return () => {
      window.removeEventListener('authRequired', handleAuthRequired);
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [authStatus.isAuthenticated, refreshToken]);

  // Auto-refresh auth status periodically (less frequently)
  useEffect(() => {
    if (!authStatus.isAuthenticated) return;

    const interval = setInterval(() => {
      checkAuthStatus();
    }, 15 * 60 * 1000); // Every 15 minutes instead of 5

    return () => clearInterval(interval);
  }, [authStatus.isAuthenticated, checkAuthStatus]);

  return {
    // Status
    isAuthenticated: authStatus.isAuthenticated,
    user: authStatus.user,
    loading: authStatus.loading,
    error,
    tokenExpiry: authStatus.tokenExpiry,
    scopes: authStatus.scopes,
    
    // Actions
    initiateAuth,
    handleAuthCallback,
    refreshToken,
    signOut,
    testAuth,
    checkAuthStatus,
    
    // Utils
    isTokenExpiringSoon: isTokenExpiringSoon(),
    timeUntilExpiry: authStatus.tokenExpiry ? 
      Math.max(0, new Date(authStatus.tokenExpiry) - new Date()) : null
  };
}
