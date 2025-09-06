import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
          const decodedTokens = JSON.parse(atob(decodeURIComponent(tokens)));
          console.log('🔐 Decoded tokens:', decodedTokens);
          
          // Store tokens in IndexedDB
          await apiService.storeTokens(decodedTokens);
          console.log('✅ Tokens stored successfully from redirect');
          
          // Verify tokens were stored
          const storedTokens = await apiService.getStoredTokens();
          console.log('🔍 Verified stored tokens:', storedTokens);
          
          addNotification({
            type: 'success',
            title: 'Authentication Successful',
            message: 'Successfully connected to Google Calendar'
          });
          
          // Update auth status and redirect
          await auth.checkAuthStatus();
          
          // Get return URL or default to home
          const returnUrl = sessionStorage.getItem('auth_return_url') || '/';
          sessionStorage.removeItem('auth_return_url');
          
          // Clear URL parameters and redirect
          window.history.replaceState({}, document.title, returnUrl);
          
        } catch (decodeError) {
          console.error('Failed to process tokens from redirect:', decodeError);
          addNotification({
            type: 'error',
            title: 'Authentication Error',
            message: 'Failed to process authentication tokens'
          });
        }
      } else if (error) {
        // Authentication failed
        addNotification({
          type: 'error',
          title: 'Authentication Failed',
          message: decodeURIComponent(error)
        });
        
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (code) {
        // Fallback: handle code parameter (for older flow)
        auth.handleAuthCallback(code).catch(error => {
          addNotification({
            type: 'error',
            title: 'Authentication Error',
            message: error.message || 'Failed to complete authentication'
          });
        });
      }
    };
    
    if (tokens || error || code) {
      handleAuthResult();
    }
  }, [auth, addNotification]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 pt-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-text-primary">Sports Calendar</h1>
          </div>
          
          <p className="text-text-secondary text-xl max-w-2xl mx-auto">
            Connect your Google Calendar to sync sports events automatically
          </p>
        </div>

        <div className="space-y-8">
          {/* Main Authentication Card */}
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-red-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">Connect Google Calendar</h2>
              <p className="text-text-secondary max-w-lg mx-auto">
                To get started, you'll need to connect your Google Calendar account. 
                This allows the app to create and manage calendar events for your 
                favorite sports matches.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-default bg-background border border-border">
                <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-primary">Automatic event creation</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-default bg-background border border-border">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-text-primary">Real-time synchronization</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-default bg-background border border-border">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-text-primary">Secure OAuth authentication</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-default bg-background border border-border">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-text-primary">Customizable preferences</span>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={auth.loading}
              className="btn-primary w-full text-lg py-4 disabled:opacity-50"
            >
              {auth.loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="loading-spinner w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Connect Google Calendar</span>
                </div>
              )}
            </button>

            {/* Error Display */}
            {auth.error && (
              <div className="mt-6 p-4 bg-accent/20 border border-accent/30 rounded-default flex items-center gap-3">
                <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-accent">{auth.error}</span>
              </div>
            )}
          </div>

          {/* Privacy & Permissions Card */}
          <div className="card p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Privacy & Permissions</h3>
            <p className="text-text-secondary mb-6">
              This app requires the following Google Calendar permissions:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-text-primary">View your calendar events</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-text-primary">Create new calendar events</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-text-primary">Edit events created by this app</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-text-primary">Delete events created by this app</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-text-secondary">
                Your data is only used for calendar integration and is not shared with third parties.
              </p>
            </div>
          </div>

          {/* Help Section Card */}
          <div className="card p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Need Help?</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-default bg-background border border-border">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <strong className="text-text-primary block mb-1">Authentication Issues:</strong>
                    <p className="text-text-secondary">Make sure you allow the requested permissions when prompted by Google.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-default bg-background border border-border">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  <div>
                    <strong className="text-text-primary block mb-1">Browser Compatibility:</strong>
                    <p className="text-text-secondary">This app works best with modern browsers. Enable cookies and JavaScript.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-default bg-background border border-border">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <strong className="text-text-primary block mb-1">Multiple Accounts:</strong>
                    <p className="text-text-secondary">If you have multiple Google accounts, make sure to sign in with the correct one.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
