import Dexie from 'dexie';

/**
 * IndexedDB database for storing user preferences and synced events
 * This provides offline storage and persistence across browser sessions
 */
class MatchesDatabase extends Dexie {
  constructor() {
    super('MatchesCalendarDB');
    
    // Define database schema
    this.version(2).stores({
      preferences: 'id',                    // User preferences
      syncedEvents: 'id, eventId, googleCalendarEventId, status, syncedAt, sport, organization', // Synced events with indexes
      eventCache: 'id, dataSource, timestamp, sport', // Cached API responses
      authTokens: 'id, provider',          // Authentication tokens
      syncHistory: '++id, timestamp, status', // Sync operation history
      eventColors: 'eventId, colorId, updatedAt' // Event color preferences
    }).upgrade(trans => {
      // Migration logic for existing users
      return trans.preferences.toCollection().modify(prefs => {
        if (!prefs.eventColors) {
          prefs.eventColors = {
            defaultColorId: '10', // Basil (green) as default
            lastUpdated: null
          };
        }
      });
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
          advancedFilters: {
            currentFilters: [],
            savedSets: [],
            lastUpdated: null
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
          eventColors: {
            defaultColorId: '10', // Basil (green) as default
            lastUpdated: null
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
    const authEntry = {
      id: provider,
      provider: provider,
      tokens: tokens,
      storedAt: new Date(),
      expiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null
    };
    
    try {
      await db.authTokens.put(authEntry);
      // Only log success, not all the details
      console.log('✅ Auth tokens stored successfully for', provider);
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

  /**
   * Advanced Filters Management
   */

  /**
   * Get advanced filters
   */
  static async getAdvancedFilters() {
    const prefs = await this.getPreferences();
    return prefs?.advancedFilters || { currentFilters: [], savedSets: [] };
  }

  /**
   * Update advanced filters
   */
  static async updateAdvancedFilters(advancedFilters) {
    return await this.updatePreferences({
      advancedFilters: {
        ...advancedFilters,
        lastUpdated: new Date().toISOString()
      }
    });
  }

  /**
   * Save a new filter set
   */
  static async saveFilterSet(name, filters) {
    const prefs = await this.getPreferences();
    const advancedFilters = prefs?.advancedFilters || { currentFilters: [], savedSets: [] };
    
    const newFilterSet = {
      id: Date.now(),
      name,
      filters: [...filters],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    const updatedSavedSets = [...advancedFilters.savedSets, newFilterSet];
    
    return await this.updateAdvancedFilters({
      ...advancedFilters,
      savedSets: updatedSavedSets
    });
  }

  /**
   * Delete a saved filter set
   */
  static async deleteFilterSet(filterSetId) {
    const prefs = await this.getPreferences();
    const advancedFilters = prefs?.advancedFilters || { currentFilters: [], savedSets: [] };
    
    const updatedSavedSets = advancedFilters.savedSets.filter(set => set.id !== filterSetId);
    
    return await this.updateAdvancedFilters({
      ...advancedFilters,
      savedSets: updatedSavedSets
    });
  }

  /**
   * Load a saved filter set
   */
  static async loadFilterSet(filterSetId) {
    const prefs = await this.getPreferences();
    const advancedFilters = prefs?.advancedFilters || { currentFilters: [], savedSets: [] };
    
    const filterSet = advancedFilters.savedSets.find(set => set.id === filterSetId);
    if (!filterSet) {
      throw new Error('Filter set not found');
    }

    // Update last used timestamp
    const updatedSavedSets = advancedFilters.savedSets.map(set =>
      set.id === filterSetId 
        ? { ...set, lastUsed: new Date().toISOString() }
        : set
    );

    await this.updateAdvancedFilters({
      ...advancedFilters,
      currentFilters: filterSet.filters,
      savedSets: updatedSavedSets
    });

    return filterSet.filters;
  }

  /**
   * Set color for a specific event
   */
  static async setEventColor(eventId, colorId) {
    try {
      await db.eventColors.put({
        eventId: eventId,
        colorId: colorId,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to set event color:', error);
      throw error;
    }
  }

  /**
   * Get color for a specific event
   */
  static async getEventColor(eventId) {
    try {
      const colorRecord = await db.eventColors.get(eventId);
      if (colorRecord) {
        return colorRecord.colorId;
      }
      
      // Return default color if no specific color is set
      const prefs = await this.getPreferences();
      return prefs?.eventColors?.defaultColorId || '10'; // Default to Basil
    } catch (error) {
      console.error('Failed to get event color:', error);
      return '10'; // Fallback to default
    }
  }

  /**
   * Get colors for multiple events
   */
  static async getEventColors(eventIds) {
    try {
      const colorRecords = await db.eventColors.where('eventId').anyOf(eventIds).toArray();
      const prefs = await this.getPreferences();
      const defaultColor = prefs?.eventColors?.defaultColorId || '10';
      
      const colorMap = {};
      eventIds.forEach(eventId => {
        const record = colorRecords.find(r => r.eventId === eventId);
        colorMap[eventId] = record ? record.colorId : defaultColor;
      });
      
      return colorMap;
    } catch (error) {
      console.error('Failed to get event colors:', error);
      // Return default colors for all events
      const defaultColor = '10';
      const colorMap = {};
      eventIds.forEach(eventId => {
        colorMap[eventId] = defaultColor;
      });
      return colorMap;
    }
  }

  /**
   * Update default event color
   */
  static async updateDefaultEventColor(colorId) {
    try {
      const prefs = await this.getPreferences();
      if (prefs) {
        await this.updatePreferences({
          eventColors: {
            ...prefs.eventColors,
            defaultColorId: colorId,
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Failed to update default event color:', error);
      throw error;
    }
  }
}

export default DatabaseService;
