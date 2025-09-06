import express from 'express';
import googleCalendarService from '../services/calendar/google.js';
import { validate, schemas } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { calendarRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply calendar-specific rate limiting
router.use(calendarRateLimit);

/**
 * POST /api/calendar/events
 * Create a single calendar event
 */
router.post('/events',
  validate(schemas.calendarEvent),
  asyncHandler(async (req, res) => {
    const { event, calendarId = 'primary' } = req.body;
    const tokens = req.googleTokens; // Should be set by auth middleware

    if (!tokens) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Google Calendar authentication required'
        }
      });
    }

    // Debug: Log the complete event object received from frontend
    logger.info('Calendar route received event data:', {
      title: event.title,
      startTime: event.startTime,
      tvChannel: event.tvChannel,
      venue: event.venue,
      hasChannel: !!event.tvChannel,
      calendarId,
      eventKeys: Object.keys(event)
    });

    const result = await googleCalendarService.createEvent(tokens, event, calendarId);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * PUT /api/calendar/events/:googleEventId
 * Update an existing calendar event
 */
router.put('/events/:googleEventId',
  validate(schemas.calendarEvent),
  asyncHandler(async (req, res) => {
    const { googleEventId } = req.params;
    const { event, calendarId = 'primary' } = req.body;
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

    logger.info('Updating calendar event:', {
      googleEventId,
      title: event.title,
      calendarId
    });

    const result = await googleCalendarService.updateEvent(tokens, googleEventId, event, calendarId);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * DELETE /api/calendar/events/:googleEventId
 * Delete a calendar event
 */
router.delete('/events/:googleEventId',
  asyncHandler(async (req, res) => {
    const { googleEventId } = req.params;
    const { calendarId = 'primary' } = req.query;
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

    logger.info('Deleting calendar event:', {
      googleEventId,
      calendarId
    });

    const result = await googleCalendarService.deleteEvent(tokens, googleEventId, calendarId);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * POST /api/calendar/events/batch
 * Create multiple calendar events
 */
router.post('/events/batch',
  asyncHandler(async (req, res) => {
    const { events, calendarId = 'primary' } = req.body;
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

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Events array is required and must not be empty'
        }
      });
    }

    if (events.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_EVENTS',
          message: 'Maximum 50 events allowed per batch request'
        }
      });
    }

    logger.info('Creating batch calendar events:', {
      eventCount: events.length,
      calendarId
    });

    const result = await googleCalendarService.createBatchEvents(tokens, events, calendarId);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * DELETE /api/calendar/events/batch
 * Delete multiple calendar events
 */
router.delete('/events/batch',
  asyncHandler(async (req, res) => {
    const { googleEventIds, calendarId = 'primary' } = req.body;
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

    if (!Array.isArray(googleEventIds) || googleEventIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'googleEventIds array is required and must not be empty'
        }
      });
    }

    logger.info('Deleting batch calendar events:', {
      eventCount: googleEventIds.length,
      calendarId
    });

    const result = await googleCalendarService.deleteBatchEvents(tokens, googleEventIds, calendarId);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /api/calendar/calendars
 * Get user's calendar list
 */
router.get('/calendars',
  asyncHandler(async (req, res) => {
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

    const calendars = await googleCalendarService.getCalendarList(tokens);

    res.json({
      success: true,
      data: {
        calendars,
        count: calendars.length
      }
    });
  })
);

/**
 * GET /api/calendar/health
 * Health check for calendar service
 */
router.get('/health',
  asyncHandler(async (req, res) => {
    const isConfigured = googleCalendarService.isConfigured();
    
    const health = {
      status: isConfigured ? 'healthy' : 'misconfigured',
      configured: isConfigured,
      timestamp: new Date().toISOString()
    };

    if (!isConfigured) {
      health.issues = ['Google Calendar credentials not configured'];
    }

    res.status(isConfigured ? 200 : 503).json({
      success: isConfigured,
      data: health
    });
  })
);

export default router;
