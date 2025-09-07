import { google } from 'googleapis';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Google Calendar integration service
 * Handles OAuth authentication and calendar operations
 */
class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = google.calendar({ version: 'v3' });
    this.initialized = false;
    this.credentials = null;
    
    // Paths for credential files
    this.credentialsPath = path.join(process.cwd(), 'credentials.json');
    this.tokenPath = path.join(process.cwd(), 'token.json');
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Load credentials from credentials.json file
      await this.loadCredentials();
      
      // Initialize OAuth2 client with credentials
      this.oauth2Client = new google.auth.OAuth2(
        this.credentials.installed.client_id,
        this.credentials.installed.client_secret,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
      );

      // Try to load existing tokens if available
      await this.loadExistingTokens();

      this.initialized = true;
      logger.info('Google Calendar service initialized with credentials.json');
    } catch (error) {
      logger.error('Failed to initialize Google Calendar service:', error);
      throw error;
    }
  }

  /**
   * Load credentials from credentials.json file
   */
  async loadCredentials() {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        const credentialsData = fs.readFileSync(this.credentialsPath, 'utf8');
        this.credentials = JSON.parse(credentialsData);
        logger.info('Loaded Google credentials from credentials.json');
      } else {
        throw new Error('credentials.json file not found');
      }
    } catch (error) {
      logger.error('Failed to load credentials.json:', error);
      throw error;
    }
  }

  /**
   * Load existing tokens from file if available
   */
  async loadExistingTokens() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        logger.info('Loaded existing Google Calendar tokens');
        
        // Check if token is valid and refresh if needed
        await this.validateAndRefreshToken();
      }
    } catch (error) {
      logger.warn('Failed to load existing tokens:', error.message);
    }
  }

  /**
   * Validate current token and refresh if needed
   */
  async validateAndRefreshToken() {
    try {
      // Try to make a simple API call to validate the token
      await this.calendar.calendarList.list({
        auth: this.oauth2Client,
        maxResults: 1
      });
      logger.info('Google Calendar token is valid');
      return true;
    } catch (error) {
      if (error.code === 401) {
        // Token expired, try to refresh
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          this.saveTokens(credentials);
          logger.info('Google Calendar token refreshed successfully');
          return true;
        } catch (refreshError) {
          logger.warn('Failed to refresh Google Calendar token:', refreshError.message);
          return false;
        }
      } else {
        logger.warn('Token validation failed:', error.message);
        return false;
      }
    }
  }

  /**
   * Save tokens to file
   */
  saveTokens(tokens) {
    try {
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
      logger.info('Google Calendar tokens saved');
    } catch (error) {
      logger.error('Failed to save tokens:', error);
    }
  }

  /**
   * Generate OAuth URL for user consent
   */
  getAuthUrl(state = null) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state
    });

    logger.info('Generated Google OAuth URL');
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Set credentials and save to file
      this.oauth2Client.setCredentials(tokens);
      this.saveTokens(tokens);
      
      logger.info('Successfully exchanged code for tokens');
      
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope
      };
    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      logger.info('Successfully refreshed access token');
      
      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiryDate: credentials.expiry_date,
        tokenType: credentials.token_type
      };
    } catch (error) {
      logger.error('Failed to refresh tokens:', error);
      throw new Error('Failed to refresh authentication tokens');
    }
  }

  /**
   * Create authenticated calendar client
   */
  getCalendarClient(tokens) {
    const authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    authClient.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate
    });

    return google.calendar({ version: 'v3', auth: authClient });
  }

  /**
   * Search for existing events by title and date to prevent duplicates
   */
  async findExistingEvent(tokens, event, calendarId = 'primary') {
    try {
      const calendar = this.getCalendarClient(tokens);
      
      // Search for events on the same day with similar title
      const startDate = new Date(event.startTime);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999); // End of the same day
      
      const response = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        q: event.title, // Search by title
        singleEvents: true,
        orderBy: 'startTime'
      });

      // Check for exact matches (same title and similar start time)
      const existingEvents = response.data.items || [];
      for (const existingEvent of existingEvents) {
        if (existingEvent.summary === event.title) {
          const existingStart = new Date(existingEvent.start.dateTime || existingEvent.start.date);
          const eventStart = new Date(event.startTime);
          
          // If events are within 1 hour of each other, consider them duplicates
          const timeDiff = Math.abs(existingStart.getTime() - eventStart.getTime());
          if (timeDiff < 60 * 60 * 1000) { // 1 hour in milliseconds
            return {
              id: existingEvent.id,
              summary: existingEvent.summary,
              start: existingEvent.start
            };
          }
        }
      }
      
      return null; // No duplicate found
    } catch (error) {
      logger.warn('Failed to search for existing events:', error.message);
      return null; // Proceed with creation if search fails
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(tokens, event, calendarId = 'primary') {
    try {
      // First, check for existing events
      const existingEvent = await this.findExistingEvent(tokens, event, calendarId);
      if (existingEvent) {
        logger.info(`Event already exists: ${event.title}`, {
          existingEventId: existingEvent.id,
          calendarId
        });
        
        return {
          googleEventId: existingEvent.id,
          status: 'already_exists',
          message: 'Event already exists in calendar'
        };
      }

      const calendar = this.getCalendarClient(tokens);
      
      // Debug: Log the event object to see what we're working with
      logger.info('Creating calendar event with data:', {
        title: event.title,
        tvChannel: event.tvChannel,
        venue: event.venue,
        hasChannel: !!event.tvChannel
      });
      
      const eventData = {
        summary: event.title,
        description: this.buildEventDescription(event),
        start: {
          dateTime: event.startTime,
          timeZone: 'Europe/Athens'  // Using specific timezone like your example
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'Europe/Athens'
        },
        location: event.tvChannel || event.venue || 'TV Broadcast',  // Ensure non-empty location
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 60 }
          ]
        },
        colorId: event.colorId || this.getColorForSport(event.sport),
        source: {
          title: 'Sports Calendar',
          url: 'https://matches-calendar.app'
        }
      };

      // Debug: Log the final eventData being sent to Google
      logger.info('Final Google Calendar eventData:', {
        summary: eventData.summary,
        location: eventData.location,
        start: eventData.start,
        end: eventData.end
      });

      const response = await calendar.events.insert({
        calendarId,
        resource: eventData
      });

      logger.info(`Created calendar event: ${event.title}`, {
        googleEventId: response.data.id,
        calendarId
      });

      return {
        googleEventId: response.data.id,
        htmlLink: response.data.htmlLink,
        status: response.data.status
      };
    } catch (error) {
      logger.error('Failed to create calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(tokens, googleEventId, event, calendarId = 'primary') {
    try {
      const calendar = this.getCalendarClient(tokens);
      
      const eventData = {
        summary: event.title,
        description: this.buildEventDescription(event),
        start: {
          dateTime: event.startTime,
          timeZone: 'Europe/Athens'
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'Europe/Athens'
        },
        location: event.tvChannel || event.venue || 'TV Broadcast',
        colorId: this.getColorForSport(event.sport)
      };

      const response = await calendar.events.update({
        calendarId,
        eventId: googleEventId,
        resource: eventData
      });

      logger.info(`Updated calendar event: ${event.title}`, {
        googleEventId,
        calendarId
      });

      return {
        googleEventId: response.data.id,
        htmlLink: response.data.htmlLink,
        status: response.data.status
      };
    } catch (error) {
      logger.error('Failed to update calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(tokens, googleEventId, calendarId = 'primary') {
    try {
      const calendar = this.getCalendarClient(tokens);
      
      await calendar.events.delete({
        calendarId,
        eventId: googleEventId
      });

      logger.info(`Deleted calendar event: ${googleEventId}`, { calendarId });
      
      return { success: true };
    } catch (error) {
      // Event might already be deleted
      if (error.code === 404 || error.status === 404) {
        logger.warn(`Calendar event not found (already deleted?): ${googleEventId}`);
        return { success: true, warning: 'Event not found' };
      }
      
      logger.error('Failed to delete calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  /**
   * Create multiple events in batch
   */
  async createBatchEvents(tokens, events, calendarId = 'primary') {
    const results = {
      created: [],
      failed: []
    };

    // Process in chunks to avoid rate limits
    const chunkSize = 5;
    const delayBetweenChunks = 1000; // 1 second

    for (let i = 0; i < events.length; i += chunkSize) {
      const chunk = events.slice(i, i + chunkSize);
      
      logger.info(`Processing batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(events.length / chunkSize)}`);
      
      const promises = chunk.map(async (event) => {
        try {
          const result = await this.createEvent(tokens, event, calendarId);
          results.created.push({
            eventId: event.id,
            googleEventId: result.googleEventId,
            htmlLink: result.htmlLink
          });
        } catch (error) {
          logger.error(`Failed to create event ${event.id}:`, error);
          results.failed.push({
            eventId: event.id,
            error: error.message,
            event: event
          });
        }
      });

      await Promise.all(promises);
      
      // Rate limit delay between chunks
      if (i + chunkSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
      }
    }

    logger.info(`Batch creation completed: ${results.created.length} created, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Delete multiple events in batch
   */
  async deleteBatchEvents(tokens, googleEventIds, calendarId = 'primary') {
    const results = {
      deleted: [],
      failed: []
    };

    const chunkSize = 5;
    const delayBetweenChunks = 1000;

    for (let i = 0; i < googleEventIds.length; i += chunkSize) {
      const chunk = googleEventIds.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (googleEventId) => {
        try {
          await this.deleteEvent(tokens, googleEventId, calendarId);
          results.deleted.push({ googleEventId });
        } catch (error) {
          logger.error(`Failed to delete event ${googleEventId}:`, error);
          results.failed.push({
            googleEventId,
            error: error.message
          });
        }
      });

      await Promise.all(promises);
      
      if (i + chunkSize < googleEventIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
      }
    }

    logger.info(`Batch deletion completed: ${results.deleted.length} deleted, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList(tokens) {
    try {
      const calendar = this.getCalendarClient(tokens);
      
      const response = await calendar.calendarList.list({
        maxResults: 50
      });

      const calendars = response.data.items.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor
      }));

      return calendars;
    } catch (error) {
      logger.error('Failed to get calendar list:', error);
      throw new Error(`Failed to get calendar list: ${error.message}`);
    }
  }

  /**
   * Build comprehensive event description
   */
  buildEventDescription(event) {
    const parts = [];
    
    if (event.description) {
      parts.push(event.description);
    }
    
    // Event details
    const details = [
      `Sport: ${event.sport}`,
      `Organization: ${event.organization}`,
      `Teams: ${Array.isArray(event.teams) ? event.teams.join(' vs ') : event.teams}`,
      event.venue ? `Venue: ${event.venue}` : null,
      event.tvChannel ? `TV Channel: ${event.tvChannel}` : null,
      `Data Source: ${event.dataSource}`
    ].filter(Boolean);
    
    parts.push(details.join('\n'));
    
    // Broadcast information
    if (event.broadcastInfo && event.broadcastInfo.length > 0) {
      const broadcasts = event.broadcastInfo.map(b => `${b.network} (${b.type})`).join(', ');
      parts.push(`Broadcasting: ${broadcasts}`);
    }
    
    // Footer
    parts.push('\n---\nCreated by Sports Matches Calendar');

    return parts.join('\n\n');
  }

  /**
   * Map sports to Google Calendar colors
   */
  getColorForSport(sport) {
    const colorMap = {
      'football': '7',     // Peacock
      'basketball': '6',   // Orange
      'soccer': '10',      // Green
      'baseball': '11',    // Red
      'hockey': '9',       // Blue
      'tennis': '5',       // Yellow
      'volleyball': '3',   // Purple
      'other': '8'         // Graphite
    };

    return colorMap[sport?.toLowerCase()] || colorMap.other;
  }

  /**
   * Validate tokens and refresh if needed
   */
  async validateAndRefreshTokens(tokens) {
    try {
      // Try to make a simple API call to validate tokens
      const calendar = this.getCalendarClient(tokens);
      await calendar.calendarList.list({ maxResults: 1 });
      
      return tokens; // Tokens are valid
    } catch (error) {
      if (error.code === 401 && tokens.refreshToken) {
        // Try to refresh tokens
        logger.info('Access token expired, attempting refresh');
        return await this.refreshTokens(tokens.refreshToken);
      }
      
      throw error;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured() {
    return !!(this.credentials && this.oauth2Client);
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  isAuthenticated() {
    return !!(this.oauth2Client && this.oauth2Client.credentials && this.oauth2Client.credentials.access_token);
  }
}

export default new GoogleCalendarService();
