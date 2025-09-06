/**
 * Shared type definitions between frontend and backend
 * This ensures consistency across the full-stack application
 */

// Core data structures
export const DataTypes = {
  UserPreferences: {
    id: 'string',
    syncInterval: 'number', // minutes (minimum 30)
    autoSyncEnabled: 'boolean',
    selectedDataSources: 'array', // DataSource[]
    filters: 'object', // EventFilters
    notifications: 'object', // NotificationSettings
    googleCalendar: 'object', // GoogleCalendarConfig
    createdAt: 'date',
    updatedAt: 'date'
  },

  SportsEvent: {
    id: 'string',
    externalId: 'string', // ID from the data source
    title: 'string',
    description: 'string',
    startTime: 'date',
    endTime: 'date',
    teams: 'array', // Team[]
    organization: 'string',
    sport: 'string', // SportType
    dataSource: 'string', // DataSource
    venue: 'object', // Venue
    broadcastInfo: 'array', // BroadcastInfo[]
    status: 'string', // EventStatus
    metadata: 'object'
  },

  SyncedEvent: {
    id: 'string',
    eventId: 'string',
    googleCalendarEventId: 'string',
    title: 'string',
    startTime: 'date',
    endTime: 'date',
    teams: 'array',
    organization: 'string',
    sport: 'string',
    dataSource: 'string',
    venue: 'string',
    syncedAt: 'date',
    syncStatus: 'string', // SyncStatus
    lastUpdatedAt: 'date'
  }
};

// Enums and Constants
export const SportTypes = [
  'football', 'basketball', 'baseball', 'hockey', 'soccer', 
  'tennis', 'golf', 'mma', 'boxing', 'other'
];

export const DataSources = [
  '24media', 'gazzetta', 'flashscore', 'custom'
];

export const EventStatuses = [
  'scheduled', 'live', 'completed', 'postponed', 'cancelled'
];

export const SyncStatuses = [
  'active', 'removed', 'failed', 'pending'
];

// API Response structure
export const ApiResponseStructure = {
  success: 'boolean',
  data: 'any',
  error: 'object', // ApiError
  metadata: 'object'
};

// Configuration constants
export const AppConstants = {
  MIN_SYNC_INTERVAL: 30, // minutes
  MAX_SYNC_INTERVAL: 1440, // 24 hours
  DEFAULT_SYNC_INTERVAL: 60,
  MAX_EVENTS_PER_REQUEST: 100,
  CACHE_TTL: 300, // seconds
  DEFAULT_DATE_RANGE: 7, // days
  MAX_DATE_RANGE: 30 // days
};

// Greek team mappings from existing config
export const GreekTeams = {
  basketball: [
    'ΟΛΥΜΠΙΑΚΟΣ', 'ΠΑΝΑΘΗΝΑΙΚΟΣ', 'Παναθηναϊκός', 'Ολυμπιακός'
  ],
  football: [
    'ΕΛΛΑΔΑ', 'ΟΛΥΜΠΙΑΚΟΣ', 'ΠΑΝΑΘΗΝΑΙΚΟΣ'
  ]
};

export const GreekLeagues = [
  'Euroleague', 'Superleague', 'Super League', 
  'Basket League', 'Football League', 'GBL', 'Stoiximan'
];

export const GreekSports = [
  'basket', 'football', 'podosfairo', 'mpasket', 'basketball'
];
