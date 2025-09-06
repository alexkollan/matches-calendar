import Dexie from 'dexie';

/**
 * IndexedDB database for storing user preferences and synced events
 * This provides offline storage and persistence across browser sessions
 */
class MatchesDatabase extends Dexie {
  constructor() {
    super('MatchesCalendarDB');
    
    // Define database schema
    this.version(1).stores({
      preferences: 'id',                    // User preferences
      syncedEvents: 'id, eventId, googleCalendarEventId, status, syncedAt, sport, organization', // Synced events with indexes
      eventCache: 'id, dataSource, timestamp, sport', // Cached API responses
      authTokens: 'id, provider',          // Authentication tokens
      syncHistory: '++id, timestamp, status' // Sync operation history
    });

    // Define hooks for data validation
    this.syncedEvents.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.syncedEvents.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });
  }
}

// Create database instance
export const db = new MatchesDatabase();

/**
 * Database service with helper methods
 */
export class DatabaseService {
  
  /**
   * Initialize database with default preferences
   */
  static async initialize() {
    try {
      // Check if preferences exist
      const prefs = await db.preferences.get('user-preferences');
      
      if (!prefs) {
        // Create default preferences
        await db.preferences.add({
          id: 'user-preferences',
          syncInterval: 60, // 1 hour
          autoSyncEnabled: false,
          selectedDataSources: ['24media'],
          filters: {
            teams: [],
            organizations: [],
            sports: [],
            dateRange: 7
          },
          notifications: {
            minutesBefore: [30, 60],
            emailNotification: false,
            popupNotification: true
          },
          googleCalendar: {
            calendarId: 'primary',
            isConnected: false,
            lastConnectedAt: null
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('Database initialized with default preferences');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences() {
    return await db.preferences.get('user-preferences');
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(updates) {
    try {
      let existing = await db.preferences.get('user-preferences');
      if (!existing) {
        // Create default preferences if they don't exist
        const defaultPreferences = {
          id: 'user-preferences',
          selectedTeams: [],
          selectedLeagues: [],
          selectedSports: [],
          sources: ['24media'],
          dateRange: { start: null, end: null },
          notifications: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const merged = { ...defaultPreferences, ...updates, updatedAt: new Date() };
        await db.preferences.put(merged);
        return merged;
      }
      
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };

      await db.preferences.put(updated);
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get all synced events
   */
  static async getSyncedEvents(filters = {}) {
    let query = db.syncedEvents.where('status').equals('active');

    // Apply filters
    if (filters.sport) {
      query = query.and(event => event.sport === filters.sport);
    }
    
    if (filters.organization) {
      query = query.and(event => event.organization === filters.organization);
    }

    if (filters.dateRange) {
      const now = new Date();
      const endDate = new Date(now.getTime() + filters.dateRange * 24 * 60 * 60 * 1000);
      query = query.and(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= now && eventDate <= endDate;
      });
    }

    const events = await query.toArray();
    return events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }

  /**
   * Add synced event
   */
  static async addSyncedEvent(event) {
    const syncedEvent = {
      id: crypto.randomUUID(),
      eventId: event.id || event.eventId,
      googleCalendarEventId: event.googleCalendarEventId || event.googleEventId,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      teams: Array.isArray(event.teams) ? event.teams : [event.teams],
      organization: event.organization,
      sport: event.sport,
      dataSource: event.dataSource,
      venue: event.venue || '',
      syncedAt: new Date(),
      status: 'active'
    };

    await db.syncedEvents.add(syncedEvent);
    return syncedEvent;
  }

  /**
   * Update synced event
   */
  static async updateSyncedEvent(id, updates) {
    await db.syncedEvents.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Remove synced event (mark as removed)
   */
  static async removeSyncedEvent(id) {
    await db.syncedEvents.update(id, {
      status: 'removed',
      removedAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Delete synced event permanently
   */
  static async deleteSyncedEvent(id) {
    await db.syncedEvents.delete(id);
  }

  /**
   * Get synced event by Google Calendar event ID
   */
  static async getSyncedEventByGoogleId(googleEventId) {
    return await db.syncedEvents
      .where('googleCalendarEventId')
      .equals(googleEventId)
      .first();
  }

  /**
   * Get synced event by original event ID
   */
  static async getSyncedEventByEventId(eventId) {
    return await db.syncedEvents
      .where('eventId')
      .equals(eventId)
      .first();
  }

  /**
   * Cache API response
   */
  static async cacheResponse(key, data, dataSource) {
    const cacheEntry = {
      id: key,
      data: data,
      dataSource: dataSource,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    await db.eventCache.put(cacheEntry);
  }

  /**
   * Get cached response
   */
  static async getCachedResponse(key) {
    const cached = await db.eventCache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (new Date() > cached.expiresAt) {
      await db.eventCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear expired cache entries
   */
  static async clearExpiredCache() {
    const now = new Date();
    await db.eventCache.where('expiresAt').below(now).delete();
  }

  /**
   * Store authentication tokens
   */
  static async storeAuthTokens(provider, tokens) {
    console.log('🗃️ DatabaseService.storeAuthTokens called with:', { provider, tokens });
    
    const authEntry = {
      id: provider,
      provider: provider,
      tokens: tokens,
      storedAt: new Date(),
      expiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null
    };

    console.log('📝 Storing auth entry:', authEntry);
    
    try {
      await db.authTokens.put(authEntry);
      console.log('✅ Auth tokens stored successfully');
      
      // Verify storage
      const stored = await db.authTokens.get(provider);
      console.log('🔍 Verification - stored tokens:', stored);
    } catch (error) {
      console.error('❌ Failed to store auth tokens:', error);
      throw error;
    }
  }

  /**
   * Get authentication tokens
   */
  static async getAuthTokens(provider) {
    const auth = await db.authTokens.get(provider);
    
    if (!auth) return null;
    
    // Check if expired
    if (auth.expiresAt && new Date() > auth.expiresAt) {
      console.warn('Stored tokens are expired');
      // Don't delete - might have refresh token
    }
    
    return auth.tokens;
  }

  /**
   * Remove authentication tokens
   */
  static async removeAuthTokens(provider) {
    await db.authTokens.delete(provider);
  }

  /**
   * Add sync history entry
   */
  static async addSyncHistory(status, details = {}) {
    const entry = {
      timestamp: new Date(),
      status: status, // 'success', 'error', 'partial'
      details: details
    };

    await db.syncHistory.add(entry);
    
    // Keep only last 50 entries
    const count = await db.syncHistory.count();
    if (count > 50) {
      const oldest = await db.syncHistory.orderBy('id').limit(count - 50).toArray();
      await db.syncHistory.bulkDelete(oldest.map(entry => entry.id));
    }
  }

  /**
   * Get sync history
   */
  static async getSyncHistory(limit = 20) {
    return await db.syncHistory
      .orderBy('id')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Get database statistics
   */
  static async getStats() {
    const [
      preferencesCount,
      syncedEventsCount,
      cacheCount,
      authTokensCount,
      syncHistoryCount
    ] = await Promise.all([
      db.preferences.count(),
      db.syncedEvents.count(),
      db.eventCache.count(),
      db.authTokens.count(),
      db.syncHistory.count()
    ]);

    const activeSyncedEvents = await db.syncedEvents
      .where('status')
      .equals('active')
      .count();

    return {
      preferences: preferencesCount,
      syncedEvents: {
        total: syncedEventsCount,
        active: activeSyncedEvents,
        removed: syncedEventsCount - activeSyncedEvents
      },
      cache: cacheCount,
      authTokens: authTokensCount,
      syncHistory: syncHistoryCount
    };
  }

  /**
   * Export all data for backup
   */
  static async exportData() {
    const [preferences, syncedEvents, syncHistory] = await Promise.all([
      db.preferences.toArray(),
      db.syncedEvents.toArray(),
      db.syncHistory.toArray()
    ]);

    return {
      preferences,
      syncedEvents,
      syncHistory,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Clear all data (for testing/reset)
   */
  static async clearAllData() {
    await Promise.all([
      db.preferences.clear(),
      db.syncedEvents.clear(),
      db.eventCache.clear(),
      db.authTokens.clear(),
      db.syncHistory.clear()
    ]);
  }
}

export default DatabaseService;
