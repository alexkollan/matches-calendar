import express from 'express';
import sportsDataAggregator from '../services/scrapers/index.js';
import { validate, schemas } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/sports/events
 * Fetch sports events from specified data sources
 */
router.get('/events', 
  validate(schemas.sportsEventsRequest, 'query'),
  asyncHandler(async (req, res) => {
    const { sources, teams, organizations, sports, startDate, endDate, limit } = req.query;
    
    logger.info('Sports events request:', {
      sources,
      filters: { teams, organizations, sports },
      dateRange: { startDate, endDate },
      limit
    });

    const filters = {
      teams: teams ? (Array.isArray(teams) ? teams : [teams]) : [],
      organizations: organizations ? (Array.isArray(organizations) ? organizations : [organizations]) : [],
      sports: sports ? (Array.isArray(sports) ? sports : [sports]) : [],
      startDate,
      endDate,
      limit
    };

    const result = await sportsDataAggregator.fetchEvents(
      Array.isArray(sources) ? sources : [sources],
      filters
    );

    res.json({
      success: true,
      data: {
        events: result.events,
        metadata: {
          totalFound: result.metadata.totalFound,
          afterDeduplication: result.metadata.afterDeduplication,
          duration: result.metadata.duration,
          sources: result.metadata.sources
        }
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  })
);

/**
 * GET /api/sports/metadata
 * Get available teams, organizations, sports from all sources
 */
router.get('/metadata',
  asyncHandler(async (req, res) => {
    logger.info('Sports metadata request');

    const metadata = await sportsDataAggregator.getMetadata();

    res.json({
      success: true,
      data: metadata
    });
  })
);

/**
 * GET /api/sports/sources
 * Get list of available data sources
 */
router.get('/sources',
  asyncHandler(async (req, res) => {
    const sources = sportsDataAggregator.getAvailableScrapers();
    
    res.json({
      success: true,
      data: {
        sources,
        count: sources.length
      }
    });
  })
);

/**
 * GET /api/sports/cache/stats
 * Get cache statistics for all scrapers
 */
router.get('/cache/stats',
  asyncHandler(async (req, res) => {
    const stats = sportsDataAggregator.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * POST /api/sports/cache/clear
 * Clear cache for specified scrapers or all
 */
router.post('/cache/clear',
  asyncHandler(async (req, res) => {
    const { sources } = req.body;
    
    logger.info('Cache clear request:', { sources });
    
    sportsDataAggregator.clearCache(sources);
    
    res.json({
      success: true,
      data: {
        message: 'Cache cleared successfully',
        sources: sources || 'all'
      }
    });
  })
);

/**
 * GET /api/sports/health
 * Health check for sports services
 */
router.get('/health',
  asyncHandler(async (req, res) => {
    const sources = sportsDataAggregator.getAvailableScrapers();
    const cacheStats = sportsDataAggregator.getCacheStats();
    
    // Test each source with a quick metadata call
    const sourceHealth = await Promise.allSettled(
      sources.map(async (source) => {
        try {
          const scraper = sportsDataAggregator.scrapers[source];
          if (scraper && typeof scraper.getMetadata === 'function') {
            await scraper.getMetadata();
            return { source, status: 'healthy' };
          }
          return { source, status: 'unknown' };
        } catch (error) {
          return { source, status: 'error', error: error.message };
        }
      })
    );

    const healthStatus = sourceHealth.map(result => 
      result.status === 'fulfilled' ? result.value : 
      { source: 'unknown', status: 'error', error: result.reason?.message }
    );

    const allHealthy = healthStatus.every(s => s.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        sources: healthStatus,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
  })
);

export default router;
