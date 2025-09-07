import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useEvents } from '../hooks/useEvents.js';
import { useSync } from '../hooks/useSync.js';
import DatabaseService from '../services/db.js';
import FilterService from '../services/filterService.js';

/**
 * Global    const savePreferences = async () => {
      try {
        await DatabaseService.updatePreferences(state.preferences);
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    };ation state context
 * Manages authentication, preferences, and sync state
 */

// Initial state
const initialState = {
  // App settings
  preferences: {
    selectedTeams: [],
    selectedLeagues: [],
    selectedSports: [],
    sources: {
      media24: true,
      gazzetta: true
    },
    autoSync: true,
    syncInterval: 30,
    calendarIntegration: {
      enabled: false,
      calendarId: 'primary',
      eventPrefix: '[MATCH] ',
      setReminders: true,
      reminderMinutes: 15
    },
    filters: {
      dateRange: {
        start: null,
        end: null
      },
      showPastEvents: false
    },
    advancedFilters: {
      currentFilters: [],
      savedSets: [],
      lastUpdated: null
    },
    ui: {
      theme: 'dark',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      darkMode: true,
      compactView: false,
      itemsPerPage: 25
    }
  },
  
  // Data state
  data: {
    events: [],
    metadata: {
      teams: [],
      leagues: [],
      sports: []
    },
    lastUpdated: null
  },
  
  // UI state
  ui: {
    loading: false,
    error: null,
    notifications: [],
    activeView: 'events', // 'events', 'calendar', 'settings'
    sidebarOpen: true
  }
};

// Action types
const ActionTypes = {
  // Preferences
  SET_PREFERENCES: 'SET_PREFERENCES',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  SET_SELECTED_TEAMS: 'SET_SELECTED_TEAMS',
  SET_SELECTED_LEAGUES: 'SET_SELECTED_LEAGUES',
  SET_SELECTED_SPORTS: 'SET_SELECTED_SPORTS',
  UPDATE_CALENDAR_SETTINGS: 'UPDATE_CALENDAR_SETTINGS',
  UPDATE_UI_SETTINGS: 'UPDATE_UI_SETTINGS',
  UPDATE_ADVANCED_FILTERS: 'UPDATE_ADVANCED_FILTERS',
  SET_ADVANCED_FILTERS: 'SET_ADVANCED_FILTERS',
  
  // Data
  SET_EVENTS: 'SET_EVENTS',
  SET_METADATA: 'SET_METADATA',
  UPDATE_LAST_UPDATED: 'UPDATE_LAST_UPDATED',
  
  // UI
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_ACTIVE_VIEW: 'SET_ACTIVE_VIEW',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_PREFERENCES:
      return {
        ...state,
        preferences: action.payload
      };
      
    case ActionTypes.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_TEAMS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          selectedTeams: action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_LEAGUES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          selectedLeagues: action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_SPORTS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          selectedSports: action.payload
        }
      };
      
    case ActionTypes.UPDATE_CALENDAR_SETTINGS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          calendarIntegration: {
            ...state.preferences.calendarIntegration,
            ...action.payload
          }
        }
      };
      
    case ActionTypes.UPDATE_UI_SETTINGS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ui: {
            ...state.preferences.ui,
            ...action.payload
          }
        }
      };

    case ActionTypes.UPDATE_ADVANCED_FILTERS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          advancedFilters: {
            ...state.preferences.advancedFilters,
            ...action.payload
          }
        }
      };

    case ActionTypes.SET_ADVANCED_FILTERS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          advancedFilters: action.payload
        }
      };
      
    case ActionTypes.SET_EVENTS:
      return {
        ...state,
        data: {
          ...state.data,
          events: action.payload
        }
      };
      
    case ActionTypes.SET_METADATA:
      return {
        ...state,
        data: {
          ...state.data,
          metadata: action.payload
        }
      };
      
    case ActionTypes.UPDATE_LAST_UPDATED:
      return {
        ...state,
        data: {
          ...state.data,
          lastUpdated: action.payload
        }
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload
        }
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload
        }
      };
      
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: null
        }
      };
      
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload]
        }
      };
      
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            notif => notif.id !== action.payload
          )
        }
      };
      
    case ActionTypes.SET_ACTIVE_VIEW:
      return {
        ...state,
        ui: {
          ...state.ui,
          activeView: action.payload
        }
      };
      
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen
        }
      };
      
    default:
      return state;
  }
}

// Context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Integrate hooks
  const auth = useAuth();
  const events = useEvents();
  const sync = useSync();

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await DatabaseService.getPreferences();
        if (preferences) {
          dispatch({
            type: ActionTypes.SET_PREFERENCES,
            payload: { ...state.preferences, ...preferences }
          });
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    };

    loadPreferences();
  }, []);

  // Check authentication status on app initialization - only if not already checking
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Only check if auth is not already loading or authenticated
        if (!auth.loading && !auth.isAuthenticated) {
          await auth.checkAuthStatus();
        }
      } catch (err) {
        console.error('Failed to check initial auth status:', err);
      }
    };

    // Debounce to prevent multiple rapid calls
    const timeoutId = setTimeout(initializeAuth, 100);
    return () => clearTimeout(timeoutId);
  }, []); // Remove auth.checkAuthStatus dependency to prevent loops

  // Save preferences to database when they change
  useEffect(() => {
    const savePreferences = async () => {
      try {
        await DatabaseService.updatePreferences(state.preferences);
      } catch (err) {
        console.error('Failed to save preferences:', err);
      }
    };

    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(savePreferences, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.preferences]);

  // Memoized action creators to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    // Preferences
    setPreferences: (preferences) => 
      dispatch({ type: ActionTypes.SET_PREFERENCES, payload: preferences }),
    
    updatePreferences: (updates) => 
      dispatch({ type: ActionTypes.UPDATE_PREFERENCES, payload: updates }),
    
    setSelectedTeams: (teams) => 
      dispatch({ type: ActionTypes.SET_SELECTED_TEAMS, payload: teams }),
    
    setSelectedLeagues: (leagues) => 
      dispatch({ type: ActionTypes.SET_SELECTED_LEAGUES, payload: leagues }),
    
    setSelectedSports: (sports) => 
      dispatch({ type: ActionTypes.SET_SELECTED_SPORTS, payload: sports }),
    
    updateCalendarSettings: (settings) => 
      dispatch({ type: ActionTypes.UPDATE_CALENDAR_SETTINGS, payload: settings }),
    
    updateUISettings: (settings) => 
      dispatch({ type: ActionTypes.UPDATE_UI_SETTINGS, payload: settings }),
    
    // Advanced Filters
    updateAdvancedFilters: (filters) => 
      dispatch({ type: ActionTypes.UPDATE_ADVANCED_FILTERS, payload: filters }),
    
    setAdvancedFilters: (filters) => 
      dispatch({ type: ActionTypes.SET_ADVANCED_FILTERS, payload: filters }),
    
    // Data
    setEvents: (events) => 
      dispatch({ type: ActionTypes.SET_EVENTS, payload: events }),
    
    setMetadata: (metadata) => 
      dispatch({ type: ActionTypes.SET_METADATA, payload: metadata }),
    
    updateLastUpdated: (timestamp = new Date().toISOString()) => 
      dispatch({ type: ActionTypes.UPDATE_LAST_UPDATED, payload: timestamp }),
    
    // UI
    setLoading: (loading) => 
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
    
    setError: (error) => 
      dispatch({ type: ActionTypes.SET_ERROR, payload: error }),
    
    clearError: () => 
      dispatch({ type: ActionTypes.CLEAR_ERROR }),
    
    removeNotification: (id) => 
      dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id }),
    
    setActiveView: (view) => 
      dispatch({ type: ActionTypes.SET_ACTIVE_VIEW, payload: view }),
    
    toggleSidebar: () => 
      dispatch({ type: ActionTypes.TOGGLE_SIDEBAR })
  }), [dispatch]);

  // Special action with closure for auto-remove functionality
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    dispatch({
      type: ActionTypes.ADD_NOTIFICATION,
      payload: { id, ...notification }
    });
    
    // Auto-remove notification after timeout
    if (notification.autoHide !== false) {
      setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
      }, notification.duration || 5000);
    }
    
    return id;
  }, [dispatch]);

  // Memoized filtered events to prevent excessive re-renders
  const filteredEvents = useMemo(() => {
    const prefs = state.preferences;
    let filtered = events.events || [];
    
    // Apply basic filters first
    filtered = filtered.filter(event => {
      // Filter by selected teams
      if (prefs.selectedTeams.length > 0) {
        const hasTeam = prefs.selectedTeams.some(teamId => 
          event.homeTeam?.id === teamId || event.awayTeam?.id === teamId
        );
        if (!hasTeam) return false;
      }
      
      // Filter by selected leagues
      if (prefs.selectedLeagues.length > 0) {
        if (!prefs.selectedLeagues.includes(event.league?.id)) return false;
      }
      
      // Filter by selected sports
      if (prefs.selectedSports.length > 0) {
        if (!prefs.selectedSports.includes(event.sport?.id)) return false;
      }
      
      // Filter by date range
      if (prefs.filters.dateRange.start || prefs.filters.dateRange.end) {
        const eventDate = new Date(event.date);
        if (prefs.filters.dateRange.start && eventDate < new Date(prefs.filters.dateRange.start)) {
          return false;
        }
        if (prefs.filters.dateRange.end && eventDate > new Date(prefs.filters.dateRange.end)) {
          return false;
        }
      }
      
      // Filter past events
      if (!prefs.filters.showPastEvents) {
        const eventDate = new Date(event.date);
        const now = new Date();
        if (eventDate < now) return false;
      }
      
      return true;
    });
    
    // Apply advanced keyword filters
    if (prefs.advancedFilters?.currentFilters?.length > 0) {
      filtered = FilterService.applyAdvancedFilters(filtered, prefs.advancedFilters.currentFilters);
    }
    
    return filtered;
  }, [
    events.events,
    state.preferences.selectedTeams,
    state.preferences.selectedLeagues,
    state.preferences.selectedSports,
    state.preferences.filters.dateRange,
    state.preferences.filters.showPastEvents,
    state.preferences.advancedFilters?.currentFilters
  ]);

  // Memoized computed values
  const computed = useMemo(() => ({
    // Check if any teams/leagues/sports are selected
    hasSelections: 
      state.preferences.selectedTeams.length > 0 ||
      state.preferences.selectedLeagues.length > 0 ||
      state.preferences.selectedSports.length > 0,
    
    // Filtered events (now memoized above)
    filteredEvents,
    
    // Check if app is ready
    isReady: !auth.loading && events?.metadata?.sports?.length > 0
  }), [
    state.preferences.selectedTeams.length,
    state.preferences.selectedLeagues.length,
    state.preferences.selectedSports.length,
    filteredEvents,
    auth.loading,
    events?.metadata?.sports?.length
  ]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // State
    state,
    
    // Actions
    ...actions,
    addNotification, // Add the separately memoized function
    
    // Computed
    ...computed,
    
    // Hook values
    auth,
    events,
    sync
  }), [state, actions, addNotification, computed, auth, events, sync]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Export action types for external use
export { ActionTypes };
