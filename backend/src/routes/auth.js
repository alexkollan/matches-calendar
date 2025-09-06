import express from 'express';
import googleCalendarService from '../services/calendar/google.js';
import { validate, schemas } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply auth-specific rate limiting
router.use(authRateLimit);

/**
 * GET /api/auth/google/url
 * Get Google OAuth authorization URL
 */
router.get('/google/url',
  asyncHandler(async (req, res) => {
    const { state } = req.query;
    
    if (!googleCalendarService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Google Calendar service is not properly configured'
        }
      });
    }

    logger.info('Generating Google OAuth URL', { state });

    const authUrl = googleCalendarService.getAuthUrl(state);

    res.json({
      success: true,
      data: {
        authUrl,
        state
      }
    });
  })
);

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback (GET request from Google)
 */
router.get('/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      logger.error('Google OAuth error:', error);
      // Send HTML response that closes popup and notifies parent
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <h3>Authentication Error</h3>
          <p>Error: ${error}</p>
          <p>You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: '${error}'
              }, '${process.env.FRONTEND_URL}');
              window.close();
            } else {
              setTimeout(() => {
                window.location.href = '${process.env.FRONTEND_URL}/auth?error=${encodeURIComponent(error)}';
              }, 2000);
            }
          </script>
        </body>
        </html>
      `);
    }

    if (!code) {
      logger.error('No authorization code received');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <h3>Authentication Error</h3>
          <p>No authorization code received</p>
          <p>You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'No authorization code received'
              }, '${process.env.FRONTEND_URL}');
              window.close();
            } else {
              setTimeout(() => {
                window.location.href = '${process.env.FRONTEND_URL}/auth?error=no_code';
              }, 2000);
            }
          </script>
        </body>
        </html>
      `);
    }

    logger.info('Processing Google OAuth callback', { state });

    try {
      const tokens = await googleCalendarService.getTokens(code);

      logger.info('Successfully authenticated with Google Calendar');
      logger.info('Tokens to send to frontend:', tokens);

      // For redirect flow, send tokens as URL parameters (base64 encoded for safety)
      const encodedTokens = Buffer.from(JSON.stringify(tokens)).toString('base64');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth?success=true&tokens=${encodeURIComponent(encodedTokens)}`;
      
      logger.info('Redirecting to frontend with tokens');
      
      // Send HTML response that redirects to frontend with tokens
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <meta http-equiv="refresh" content="1;url=${redirectUrl}">
        </head>
        <body>
          <h3>Authentication Successful!</h3>
          <p>Redirecting you back to the app...</p>
          <script>
            console.log('🚀 Backend: Authentication successful, redirecting...');
            setTimeout(() => {
              window.location.href = '${redirectUrl}';
            }, 500);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      logger.error('Google OAuth callback failed:', error);
      
      // Send HTML response that closes popup and notifies parent of error
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <h3>Authentication Error</h3>
          <p>Error: ${error.message}</p>
          <p>You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: '${error.message}'
              }, '${process.env.FRONTEND_URL}');
              window.close();
            } else {
              setTimeout(() => {
                window.location.href = '${process.env.FRONTEND_URL}/auth?error=${encodeURIComponent(error.message)}';
              }, 2000);
            }
          </script>
        </body>
        </html>
      `);
    }
  })
);

/**
 * POST /api/auth/google/callback
 * Handle Google OAuth callback and exchange code for tokens
 */
router.post('/google/callback',
  validate(schemas.googleCallback),
  asyncHandler(async (req, res) => {
    const { code, state } = req.body;

    logger.info('Processing Google OAuth callback', { state });

    try {
      const tokens = await googleCalendarService.getTokens(code);

      logger.info('Successfully authenticated with Google Calendar');

      res.json({
        success: true,
        data: {
          ...tokens,
          message: 'Successfully authenticated with Google Calendar'
        }
      });
    } catch (error) {
      logger.error('Google OAuth callback failed:', error);
      
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_FAILED',
          message: 'Failed to exchange authorization code for tokens',
          details: error.message
        }
      });
    }
  })
);

/**
 * POST /api/auth/google/refresh
 * Refresh Google access tokens
 */
router.post('/google/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    logger.info('Refreshing Google access token');

    try {
      const tokens = await googleCalendarService.refreshTokens(refreshToken);

      logger.info('Successfully refreshed Google access token');

      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);
      
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh access token',
          details: error.message
        }
      });
    }
  })
);

/**
 * POST /api/auth/google/validate
 * Validate Google tokens and refresh if needed
 */
router.post('/google/validate',
  asyncHandler(async (req, res) => {
    const { accessToken, refreshToken, expiryDate } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ACCESS_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    const tokens = {
      accessToken,
      refreshToken,
      expiryDate
    };

    logger.info('Validating Google tokens');

    try {
      const validatedTokens = await googleCalendarService.validateAndRefreshTokens(tokens);

      const isRefreshed = validatedTokens.accessToken !== accessToken;

      res.json({
        success: true,
        data: {
          ...validatedTokens,
          refreshed: isRefreshed
        }
      });
    } catch (error) {
      logger.error('Token validation failed:', error);
      
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_VALIDATION_FAILED',
          message: 'Tokens are invalid and could not be refreshed',
          details: error.message
        }
      });
    }
  })
);

/**
 * POST /api/auth/google/revoke
 * Revoke Google tokens (logout)
 */
router.post('/google/revoke',
  asyncHandler(async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ACCESS_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    logger.info('Revoking Google tokens');

    try {
      // Note: Google doesn't provide a direct revoke endpoint in googleapis
      // The client should delete tokens from their storage
      
      res.json({
        success: true,
        data: {
          message: 'Tokens should be removed from client storage'
        }
      });
    } catch (error) {
      logger.error('Token revocation failed:', error);
      
      res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKE_FAILED',
          message: 'Failed to revoke tokens',
          details: error.message
        }
      });
    }
  })
);

/**
 * GET /api/auth/status
 * Get authentication status
 */
router.get('/status',
  asyncHandler(async (req, res) => {
    // Check if Google Calendar service is authenticated
    const isAuthenticated = googleCalendarService.isAuthenticated();

    res.json({
      success: true,
      data: {
        authenticated: isAuthenticated,
        provider: 'google',
        serviceConfigured: googleCalendarService.isConfigured(),
        timestamp: new Date().toISOString()
      }
    });
  })
);

export default router;
