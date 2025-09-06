import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

/**
 * Rate limiting middleware configuration
 */

// General API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 1) * 60 * 1000, // 1 minute in dev
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000, // 1000 requests per minute in dev
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    });
  }
});

// Stricter rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Much higher limit for development
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.'
      }
    });
  }
});

// Moderate rate limiting for calendar operations
export const calendarRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 calendar operations per 5 minutes
  message: {
    success: false,
    error: {
      code: 'CALENDAR_RATE_LIMIT_EXCEEDED',
      message: 'Too many calendar operations, please try again later.'
    }
  }
});

export default apiRateLimit;
