import Joi from 'joi';
import { SportTypes, DataSources, AppConstants } from '../../../shared/types.js';

/**
 * Request validation schemas using Joi
 */

export const schemas = {
  // Sports events request validation
  sportsEventsRequest: Joi.object({
    sources: Joi.array().items(Joi.string().valid(...DataSources)).min(1).required(),
    teams: Joi.array().items(Joi.string()).optional(),
    organizations: Joi.array().items(Joi.string()).optional(),
    sports: Joi.array().items(Joi.string().valid(...SportTypes)).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    limit: Joi.number().integer().min(1).max(AppConstants.MAX_EVENTS_PER_REQUEST).optional()
  }),

  // User preferences validation
  userPreferences: Joi.object({
    syncInterval: Joi.number()
      .integer()
      .min(AppConstants.MIN_SYNC_INTERVAL)
      .max(AppConstants.MAX_SYNC_INTERVAL)
      .required(),
    autoSyncEnabled: Joi.boolean().required(),
    selectedDataSources: Joi.array().items(Joi.string().valid(...DataSources)).min(1).required(),
    filters: Joi.object({
      teams: Joi.array().items(Joi.string()).default([]),
      organizations: Joi.array().items(Joi.string()).default([]),
      sports: Joi.array().items(Joi.string().valid(...SportTypes)).default([]),
      dateRange: Joi.number().integer().min(1).max(AppConstants.MAX_DATE_RANGE).default(7)
    }).required(),
    googleCalendarId: Joi.string().default('primary')
  }),

  // Calendar event creation
  calendarEvent: Joi.object({
    event: Joi.object({
      id: Joi.string().required(),
      title: Joi.string().required(),
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().min(Joi.ref('startTime')).required(),
      teams: Joi.array().items(Joi.string()).required(),
      organization: Joi.string().required(),
      sport: Joi.string().valid(...SportTypes).required(),
      venue: Joi.string().allow('', null).optional(),
      description: Joi.string().allow('', null).optional(),
      tvChannel: Joi.string().allow('', null).optional()
    }).required(),
    calendarId: Joi.string().default('primary')
  }),

  // Sync execution request
  syncRequest: Joi.object({
    preferences: Joi.object().required(), // Will be validated against userPreferences
    existingSyncedEvents: Joi.array().items(Joi.string()).default([])
  }),

  // Google OAuth callback
  googleCallback: Joi.object({
    code: Joi.string().required(),
    state: Joi.string().optional()
  })
};

/**
 * Middleware function to validate request data
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
          details: error.details
        }
      });
    }

    req[property] = value;
    next();
  };
};
