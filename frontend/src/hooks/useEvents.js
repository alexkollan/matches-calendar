import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api.js';
import DatabaseService from '../services/db.js';

/**
 * Hook for managing sports events data
 * Provides fetching, caching, and filtering capabilities
 */
export function useEvents() {
  const [events, setEvents] = useState([]);
  const [syncedEvents, setSyncedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  // Fetch events from API
  const fetchEvents = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Get user preferences for default sources
      const preferences = await DatabaseService.getPreferences();
      const sources = filters.sources || preferences?.selectedDataSources || ['24media'];

      const params = {
        sources: sources, // Send as array, not string
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (Array.isArray(params[key]) && params[key].length === 0) {
          delete params[key];
        }
      });

      const result = await apiClient.fetchEvents(params);
      
      if (result.success) {
        setEvents(result.data.events || []);
        
        // Cache the response
        const cacheKey = `events-${JSON.stringify(params)}`;
        await DatabaseService.cacheResponse(cacheKey, result.data.events, sources.join(','));
      } else {
        throw new Error(result.error?.message || 'Failed to fetch events');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching events:', err);
      
      // Try to load from cache on error
      try {
        const cacheKey = `events-${JSON.stringify(filters)}`;
        const cached = await DatabaseService.getCachedResponse(cacheKey);
        if (cached) {
          setEvents(cached);
          setError(`Using cached data: ${err.message}`);
        }
      } catch (cacheError) {
        console.error('Cache fallback failed:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch synced events from database
  const fetchSyncedEvents = useCallback(async (filters = {}) => {
    try {
      const synced = await DatabaseService.getSyncedEvents(filters);
      setSyncedEvents(synced);
    } catch (err) {
      console.error('Error fetching synced events:', err);
    }
  }, []);

  // Fetch metadata (teams, organizations, sports)
  const fetchMetadata = useCallback(async () => {
    try {
      const result = await apiClient.getSportsMetadata();
      
      if (result.success) {
        setMetadata(result.data);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  }, []);

  // Add event to calendar
  const addToCalendar = useCallback(async (event) => {
    try {
      // Debug: Log the event object being passed to API
      console.log('useEvents.addToCalendar received event:', {
        title: event.title,
        tvChannel: event.tvChannel,
        venue: event.venue,
        hasChannel: !!event.tvChannel,
        eventKeys: Object.keys(event)
      });
      
      const result = await apiClient.addToCalendar(event);
      
      if (result.success) {
        // Check if event already exists
        if (result.data.status === 'already_exists') {
          return {
            ...result.data,
            message: 'Event already exists in your calendar',
            type: 'info'
          };
        }
        
        // Add to local database for new events
        await DatabaseService.addSyncedEvent({
          ...event,
          googleCalendarEventId: result.data.googleEventId
        });
        
        // Refresh synced events
        await fetchSyncedEvents();
        
        return {
          ...result.data,
          message: 'Event added to calendar successfully',
          type: 'success'
        };
      } else {
        throw new Error(result.error?.message || 'Failed to add to calendar');
      }
    } catch (err) {
      console.error('Error adding to calendar:', err);
      throw err;
    }
  }, [fetchSyncedEvents]);

  // Remove event from calendar
  const removeFromCalendar = useCallback(async (syncedEvent) => {
    try {
      const result = await apiClient.removeFromCalendar(
        syncedEvent.googleCalendarEventId
      );
      
      if (result.success) {
        // Remove from local database
        await DatabaseService.removeSyncedEvent(syncedEvent.id);
        
        // Refresh synced events
        await fetchSyncedEvents();
        
        return result.data;
      } else {
        throw new Error(result.error?.message || 'Failed to remove from calendar');
      }
    } catch (err) {
      console.error('Error removing from calendar:', err);
      throw err;
    }
  }, [fetchSyncedEvents]);

  // Add multiple events to calendar
  const addBatchToCalendar = useCallback(async (events) => {
    try {
      const result = await apiClient.addBatchToCalendar(events);
      
      if (result.success) {
        // Add successful events to local database
        for (const created of result.data.created) {
          const originalEvent = events.find(e => e.id === created.eventId);
          if (originalEvent) {
            await DatabaseService.addSyncedEvent({
              ...originalEvent,
              googleCalendarEventId: created.googleEventId
            });
          }
        }
        
        // Refresh synced events
        await fetchSyncedEvents();
        
        return result.data;
      } else {
        throw new Error(result.error?.message || 'Failed to add events to calendar');
      }
    } catch (err) {
      console.error('Error adding batch to calendar:', err);
      throw err;
    }
  }, [fetchSyncedEvents]);

  // Check if event is synced
  const isEventSynced = useCallback((eventId) => {
    return syncedEvents.some(se => se.eventId === eventId && se.status === 'active');
  }, [syncedEvents]);

  // Get synced event data
  const getSyncedEvent = useCallback((eventId) => {
    return syncedEvents.find(se => se.eventId === eventId && se.status === 'active');
  }, [syncedEvents]);

  // Search events locally
  const searchEvents = useCallback((query, searchFields = ['title', 'teams', 'organization']) => {
    if (!query.trim()) return events;
    
    const lowerQuery = query.toLowerCase();
    
    return events.filter(event => {
      return searchFields.some(field => {
        const value = event[field];
        if (Array.isArray(value)) {
          return value.some(item => 
            String(item).toLowerCase().includes(lowerQuery)
          );
        }
        return String(value || '').toLowerCase().includes(lowerQuery);
      });
    });
  }, [events]);

  // Filter events by criteria
  const filterEvents = useCallback((filters) => {
    return events.filter(event => {
      // Sport filter
      if (filters.sports && filters.sports.length > 0) {
        if (!filters.sports.includes(event.sport)) return false;
      }
      
      // Organization filter
      if (filters.organizations && filters.organizations.length > 0) {
        if (!filters.organizations.includes(event.organization)) return false;
      }
      
      // Team filter
      if (filters.teams && filters.teams.length > 0) {
        const hasTeam = filters.teams.some(team => 
          event.teams.some(eventTeam => 
            eventTeam.toLowerCase().includes(team.toLowerCase())
          )
        );
        if (!hasTeam) return false;
      }
      
      // Date range filter
      if (filters.dateRange) {
        const eventDate = new Date(event.startTime);
        const now = new Date();
        const maxDate = new Date(now.getTime() + filters.dateRange * 24 * 60 * 60 * 1000);
        
        if (eventDate < now || eventDate > maxDate) return false;
      }
      
      return true;
    });
  }, [events]);

  // Load initial data on mount
  useEffect(() => {
    fetchSyncedEvents();
    fetchMetadata();
  }, [fetchSyncedEvents, fetchMetadata]);

  // Listen for sync events
  useEffect(() => {
    const handleSyncComplete = () => {
      fetchSyncedEvents();
    };

    window.addEventListener('syncComplete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('syncComplete', handleSyncComplete);
    };
  }, [fetchSyncedEvents]);

  return {
    // Data
    events,
    syncedEvents,
    metadata,
    loading,
    error,
    
    // Actions
    fetchEvents,
    fetchSyncedEvents,
    fetchMetadata,
    addToCalendar,
    removeFromCalendar,
    addBatchToCalendar,
    
    // Utils
    isEventSynced,
    getSyncedEvent,
    searchEvents,
    filterEvents,
    
    // Computed
    eventCount: events.length,
    syncedEventCount: syncedEvents.length
  };
}
