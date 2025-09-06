import axios from 'axios';
import DatabaseService from './db.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * API client for backend communication
 * Handles authentication, error handling, and request/response processing
 */
class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Track authentication state
    this.isAuthenticated = false;
    this.authTokens = null;

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        const tokens = await this.getStoredTokens();
        console.log('API Client: Stored tokens:', tokens ? 'Found' : 'Not found');
        if (tokens?.accessToken) {
          // Encode tokens as base64 for simplicity (in production, use proper JWT)
          const tokenString = btoa(JSON.stringify(tokens));
          config.headers.Authorization = `Bearer ${tokenString}`;
          console.log('API Client: Added Authorization header');
        } else {
          console.log('API Client: No valid tokens found');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            // Retry original request
            return this.client.request(error.config);
          } else {
            // Redirect to auth or emit auth error
            this.handleAuthError();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ========== Sports API Methods ==========

  /**
   * Fetch sports events with filters
   */
  async fetchEvents(params) {
    try {
      const response = await this.client.get('/sports/events', { params });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch sports events');
    }
  }

  /**
   * Get sports metadata (teams, organizations, sports)
   */
  async getSportsMetadata() {
    try {
      const response = await this.client.get('/sports/metadata');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch sports metadata');
    }
  }

  /**
   * Get available data sources
   */
  async getDataSources() {
    try {
      const response = await this.client.get('/sports/sources');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch data sources');
    }
  }

  /**
   * Clear cache for data sources
   */
  async clearCache(sources = null) {
    try {
      const response = await this.client.post('/sports/cache/clear', { sources });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to clear cache');
    }
  }

  // ========== Calendar API Methods ==========

  /**
   * Add single event to calendar
   */
  async addToCalendar(event, calendarId = 'primary') {
    try {
      // Debug: Log the event object being sent
      console.log('API Client sending event to calendar:', {
        title: event.title,
        tvChannel: event.tvChannel,
        venue: event.venue,
        hasChannel: !!event.tvChannel,
        eventKeys: Object.keys(event)
      });
      
      const response = await this.client.post('/calendar/events', {
        event,
        calendarId
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to add event to calendar');
    }
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(googleEventId, event, calendarId = 'primary') {
    try {
      const response = await this.client.put(`/calendar/events/${googleEventId}`, {
        event,
        calendarId
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to update calendar event');
    }
  }

  /**
   * Remove event from calendar
   */
  async removeFromCalendar(googleEventId, calendarId = 'primary') {
    try {
      const response = await this.client.delete(`/calendar/events/${googleEventId}`, {
        params: { calendarId }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to remove event from calendar');
    }
  }

  /**
   * Add multiple events to calendar
   */
  async addBatchToCalendar(events, calendarId = 'primary') {
    try {
      const response = await this.client.post('/calendar/events/batch', {
        events,
        calendarId
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to add events to calendar');
    }
  }

  /**
   * Remove multiple events from calendar
   */
  async removeBatchFromCalendar(googleEventIds, calendarId = 'primary') {
    try {
      const response = await this.client.delete('/calendar/events/batch', {
        data: { googleEventIds, calendarId }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to remove events from calendar');
    }
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList() {
    try {
      const response = await this.client.get('/calendar/calendars');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch calendar list');
    }
  }

  // ========== Sync API Methods ==========

  /**
   * Execute sync operation
   */
  async executeSync(preferences, existingSyncedEvents) {
    try {
      const response = await this.client.post('/sync/execute', {
        preferences,
        existingSyncedEvents
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to execute sync');
    }
  }

  /**
   * Preview sync changes without executing
   */
  async previewSync(preferences, existingSyncedEvents) {
    try {
      const response = await this.client.post('/sync/preview', {
        preferences,
        existingSyncedEvents
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to preview sync');
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const response = await this.client.get('/sync/status');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get sync status');
    }
  }

  /**
   * Test sync functionality
   */
  async testSync(source = '24media') {
    try {
      const response = await this.client.post('/sync/test', { source });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to test sync');
    }
  }

  // ========== Auth API Methods ==========

  /**
   * Get Google OAuth authorization URL
   */
  async getGoogleAuthUrl(state = null) {
    try {
      const response = await this.client.get('/auth/google/url', {
        params: { state }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get Google auth URL');
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code, state = null) {
    try {
      const response = await this.client.post('/auth/google/callback', {
        code,
        state
      });
      
      if (response.data.success) {
        await this.storeTokens(response.data.data);
        this.isAuthenticated = true;
        this.authTokens = response.data.data;
      }
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to handle Google callback');
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens() {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens?.refreshToken) {
        return false;
      }

      const response = await this.client.post('/auth/google/refresh', {
        refreshToken: tokens.refreshToken
      });

      if (response.data.success) {
        await this.storeTokens(response.data.data);
        this.authTokens = response.data.data;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Validate stored tokens
   */
  async validateTokens() {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return false;

      const response = await this.client.post('/auth/google/validate', tokens);
      
      if (response.data.success) {
        if (response.data.data.refreshed) {
          // Tokens were refreshed
          await this.storeTokens(response.data.data);
          this.authTokens = response.data.data;
        }
        this.isAuthenticated = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Logout/revoke tokens
   */
  async logout() {
    try {
      const tokens = await this.getStoredTokens();
      if (tokens?.accessToken) {
        await this.client.post('/auth/google/revoke', {
          accessToken: tokens.accessToken
        });
      }
    } catch (error) {
      console.error('Failed to revoke tokens:', error);
    } finally {
      // Clear local storage regardless
      await this.removeTokens();
      this.isAuthenticated = false;
      this.authTokens = null;
    }
  }

  /**
   * Get authentication status
   */
  async getAuthStatus() {
    try {
      const response = await this.client.get('/auth/status');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get auth status');
    }
  }

  // ========== Token Management ==========

  async getStoredTokens() {
    try {
      return await DatabaseService.getAuthTokens('google');
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }

  async storeTokens(tokens) {
    try {
      await DatabaseService.storeAuthTokens('google', tokens);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  async getStoredTokens() {
    try {
      return await DatabaseService.getAuthTokens('google');
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }

  async removeTokens() {
    try {
      await DatabaseService.removeAuthTokens('google');
    } catch (error) {
      console.error('Failed to remove tokens:', error);
    }
  }

  // ========== Utility Methods ==========

  /**
   * Handle API errors consistently
   */
  handleApiError(error, defaultMessage) {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error.message || defaultMessage);
    }
    
    if (error.request) {
      return new Error('Network error - please check your connection');
    }
    
    return new Error(error.message || defaultMessage);
  }

  /**
   * Handle authentication errors
   */
  handleAuthError() {
    this.isAuthenticated = false;
    this.authTokens = null;
    
    // Emit custom event for auth error
    window.dispatchEvent(new CustomEvent('authError', {
      detail: { message: 'Authentication required' }
    }));
  }

  /**
   * Check if client is authenticated
   */
  async checkAuthentication() {
    if (!this.isAuthenticated) {
      this.isAuthenticated = await this.validateTokens();
    }
    return this.isAuthenticated;
  }

  /**
   * Get server health status
   */
  async getHealthStatus() {
    try {
      const [sportsHealth, calendarHealth, syncHealth] = await Promise.allSettled([
        this.client.get('/sports/health'),
        this.client.get('/calendar/health'),
        this.client.get('/sync/status')
      ]);

      return {
        sports: sportsHealth.status === 'fulfilled' ? sportsHealth.value.data : null,
        calendar: calendarHealth.status === 'fulfilled' ? calendarHealth.value.data : null,
        sync: syncHealth.status === 'fulfilled' ? syncHealth.value.data : null,
        overall: sportsHealth.status === 'fulfilled' && 
                calendarHealth.status === 'fulfilled' && 
                syncHealth.status === 'fulfilled'
      };
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get health status');
    }
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;
