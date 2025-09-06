import express from 'express';
import sportsDataAggregator from '../services/scrapers/index.js';
import googleCalendarService from '../services/calendar/google.js';
import { validate, schemas } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/sync/execute
 * Execute sync based on user preferences
 */
router.post('/execute',
  validate(schemas.syncRequest),
  asyncHandler(async (req, res) => {
    const { preferences, existingSyncedEvents = [] } = req.body;
    const tokens = req.googleTokens;

    if (!tokens) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Google Calendar authentication required'
        }
      });
    }

    logger.info('Executing sync', {
      autoSyncEnabled: preferences.autoSyncEnabled,
      sources: preferences.selectedDataSources,
      existingEvents: existingSyncedEvents.length
    });

    const syncStartTime = Date.now();

    try {
      // Step 1: Fetch events based on preferences
      const fetchResult = await sportsDataAggregator.fetchEvents(
        preferences.selectedDataSources,
        {
          ...preferences.filters,
          dateRange: preferences.filters.dateRange || 7
        }
      );

      logger.info('Fetched events for sync', {
        totalEvents: fetchResult.events.length,
        errors: fetchResult.errors.length
      });

      // Step 2: Determine which events are new
      const newEvents = fetchResult.events.filter(event => 
        !existingSyncedEvents.includes(event.id)
      );

      // Step 3: Determine which existing events should be removed
      // (Events that were synced but no longer match current criteria)
      const currentEventIds = new Set(fetchResult.events.map(e => e.id));
      const eventsToRemove = existingSyncedEvents.filter(eventId => 
        !currentEventIds.has(eventId)
      );

      // Step 4: Add new events to calendar if auto-sync is enabled
      let addedEvents = [];
      if (preferences.autoSyncEnabled && newEvents.length > 0) {
        logger.info(`Adding ${newEvents.length} new events to calendar`);
        
        const batchResult = await googleCalendarService.createBatchEvents(
          tokens, 
          newEvents, 
          preferences.googleCalendarId || 'primary'
        );
        
        addedEvents = batchResult.created;
        
        if (batchResult.failed.length > 0) {
          logger.warn(`Failed to add ${batchResult.failed.length} events`, {
            failures: batchResult.failed
          });
        }
      }

      const syncEndTime = Date.now();
      const duration = syncEndTime - syncStartTime;

      const result = {
        newEvents: addedEvents,
        toRemove: eventsToRemove,
        stats: {
          totalFetched: fetchResult.events.length,
          newFound: newEvents.length,
          added: addedEvents.length,
          toRemove: eventsToRemove.length,
          duration: duration,
          fetchErrors: fetchResult.errors.length
        }
      };

      logger.info('Sync completed', result.stats);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Sync execution failed:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: 'Failed to execute sync',
          details: error.message
        }
      });
    }
  })
);

/**
 * POST /api/sync/preview
 * Preview what would be synced without actually syncing
 */
router.post('/preview',
  validate(schemas.syncRequest),
  asyncHandler(async (req, res) => {
    const { preferences, existingSyncedEvents = [] } = req.body;

    logger.info('Generating sync preview', {
      sources: preferences.selectedDataSources,
      existingEvents: existingSyncedEvents.length
    });

    try {
      // Fetch events that would be synced
      const fetchResult = await sportsDataAggregator.fetchEvents(
        preferences.selectedDataSources,
        {
          ...preferences.filters,
          dateRange: preferences.filters.dateRange || 7
        }
      );

      // Analyze what would change
      const newEvents = fetchResult.events.filter(event => 
        !existingSyncedEvents.includes(event.id)
      );

      const currentEventIds = new Set(fetchResult.events.map(e => e.id));
      const eventsToRemove = existingSyncedEvents.filter(eventId => 
        !currentEventIds.has(eventId)
      );

      const preview = {
        summary: {
          totalFound: fetchResult.events.length,
          newEvents: newEvents.length,
          eventsToRemove: eventsToRemove.length,
          unchangedEvents: existingSyncedEvents.length - eventsToRemove.length
        },
        newEvents: newEvents.slice(0, 10), // Limit preview to first 10
        eventsToRemoveIds: eventsToRemove,
        errors: fetchResult.errors
      };

      res.json({
        success: true,
        data: preview
      });

    } catch (error) {
      logger.error('Sync preview failed:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: 'Failed to generate sync preview',
          details: error.message
        }
      });
    }
  })
);

/**
 * GET /api/sync/status
 * Get sync status and statistics
 */
router.get('/status',
  asyncHandler(async (req, res) => {
    // This would typically check for ongoing sync operations
    // For now, we'll return basic service status
    
    const sportsHealth = sportsDataAggregator.getAvailableScrapers();
    const calendarHealth = googleCalendarService.isConfigured();
    
    const status = {
      syncServiceHealth: 'healthy',
      sportsDataSources: {
        available: sportsHealth,
        count: sportsHealth.length
      },
      calendarService: {
        configured: calendarHealth,
        status: calendarHealth ? 'available' : 'misconfigured'
      },
      lastChecked: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  })
);

/**
 * POST /api/sync/test
 * Test sync functionality with minimal data
 */
router.post('/test',
  asyncHandler(async (req, res) => {
    const { source = '24media' } = req.body;

    logger.info('Running sync test', { source });

    try {
      // Test sports data fetching
      const testFilters = {
        sports: ['basketball'],
        dateRange: 3,
        limit: 5
      };

      const fetchResult = await sportsDataAggregator.fetchEvents([source], testFilters);

      const testResult = {
        sportsDataTest: {
          success: true,
          eventsFound: fetchResult.events.length,
          source: source,
          errors: fetchResult.errors
        },
        calendarServiceTest: {
          configured: googleCalendarService.isConfigured(),
          success: googleCalendarService.isConfigured()
        },
        timestamp: new Date().toISOString()
      };

      const overallSuccess = testResult.sportsDataTest.success && 
                           testResult.calendarServiceTest.success;

      res.status(overallSuccess ? 200 : 503).json({
        success: overallSuccess,
        data: testResult
      });

    } catch (error) {
      logger.error('Sync test failed:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_FAILED',
          message: 'Sync test failed',
          details: error.message
        }
      });
    }
  })
);

export default router;
