import { Media24Scraper } from './Media24Scraper.js';
import { GazzettaScraper } from './GazzettaScraper.js';
import { logger } from '../../utils/logger.js';

/**
 * Aggregates data from multiple sports sources
 * Manages scraper instances and combines results
 */
class SportsDataAggregator {
  constructor() {
    this.scrapers = {
      '24media': new Media24Scraper(),
      'gazzetta': new GazzettaScraper()
    };

    this.initializeScrapers();
  }

  /**
   * Initialize all scrapers
   */
  initializeScrapers() {
    logger.info('Initializing sports data scrapers:', Object.keys(this.scrapers));
    
    // Perform any necessary setup for scrapers
    Object.entries(this.scrapers).forEach(([name, scraper]) => {
      logger.debug(`Scraper ${name} initialized with cache TTL: ${scraper.cacheTime}s`);
    });
  }

  /**
   * Fetch events from specified sources with filters
   */
  async fetchEvents(sources, filters = {}) {
    const startTime = Date.now();
    
    // Validate sources
    const validSources = sources.filter(source => this.scrapers[source]);
    const invalidSources = sources.filter(source => !this.scrapers[source]);
    
    if (invalidSources.length > 0) {
      logger.warn('Invalid data sources requested:', invalidSources);
    }

    if (validSources.length === 0) {
      throw new Error('No valid data sources specified');
    }

    logger.info(`Aggregator: Requesting sources: ${sources.join(', ')}`);
    logger.info(`Aggregator: Valid sources: ${validSources.join(', ')}`);
    logger.info(`Aggregator: Available scrapers: ${Object.keys(this.scrapers).join(', ')}`);

    // Calculate date range
    const { startDate, endDate } = this.calculateDateRange(filters);

    // Fetch from all sources in parallel
    const scraperPromises = validSources.map(async (sourceName) => {
      const scraper = this.scrapers[sourceName];
      try {
        logger.info(`Aggregator: Starting fetch from ${sourceName}`);
        const events = await scraper.fetchEvents(startDate, endDate, filters);
        logger.info(`Aggregator: ${sourceName} returned ${events.length} events`);
        
        return {
          source: sourceName,
          events: events,
          success: true
        };
      } catch (error) {
        logger.error(`Aggregator: ${sourceName} scraper failed:`, error);
        return {
          source: sourceName,
          events: [],
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(scraperPromises);

    // Aggregate results
    const allEvents = [];
    const errors = [];
    const sourceStats = {};

    results.forEach(result => {
      sourceStats[result.source] = {
        count: result.events.length,
        success: result.success
      };

      if (result.success) {
        allEvents.push(...result.events);
      } else {
        errors.push({
          source: result.source,
          error: result.error
        });
      }
    });

    // Remove duplicates
    const uniqueEvents = this.deduplicateEvents(allEvents);
    
    // Apply final filters
    const filteredEvents = this.applyFinalFilters(uniqueEvents, filters);

    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.info(`Aggregator: Event aggregation completed in ${duration}ms`, {
      totalFound: allEvents.length,
      afterDeduplication: uniqueEvents.length,
      afterFiltering: filteredEvents.length,
      sourceStats,
      errors: errors.length
    });

    logger.info(`Aggregator: Final events breakdown by source:`, 
      uniqueEvents.reduce((acc, event) => {
        acc[event.dataSource] = (acc[event.dataSource] || 0) + 1;
        return acc;
      }, {})
    );

    return {
      events: filteredEvents,
      metadata: {
        totalFound: allEvents.length,
        afterDeduplication: uniqueEvents.length,
        duration: duration,
        sources: sourceStats
      },
      errors
    };
  }

  /**
   * Calculate date range for fetching
   */
  calculateDateRange(filters) {
    const now = new Date();
    let startDate = filters.startDate ? new Date(filters.startDate) : now;
    let endDate = filters.endDate ? new Date(filters.endDate) : null;

    // If no end date, use date range from filters or default to 7 days
    if (!endDate) {
      const daysAhead = filters.dateRange || 7;
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + daysAhead);
    }

    // Ensure reasonable limits
    const maxDaysAhead = 30;
    const maxEndDate = new Date(startDate);
    maxEndDate.setDate(startDate.getDate() + maxDaysAhead);
    
    if (endDate > maxEndDate) {
      endDate = maxEndDate;
      logger.warn(`End date limited to ${maxDaysAhead} days from start date`);
    }

    return { startDate, endDate };
  }

  /**
   * Remove duplicate events across sources
   */
  deduplicateEvents(events) {
    logger.info(`Aggregator: Starting deduplication with ${events.length} events`);
    
    // Log source breakdown before deduplication
    const sourceBreakdown = events.reduce((acc, event) => {
      acc[event.dataSource] = (acc[event.dataSource] || 0) + 1;
      return acc;
    }, {});
    logger.info(`Aggregator: Events by source before deduplication:`, sourceBreakdown);
    
    const seen = new Map();
    const duplicates = [];
    
    const uniqueEvents = events.filter((event, index) => {
      // Create a signature based on teams, start time, and sport
      const teams = Array.isArray(event.teams) ? event.teams.sort() : [];
      const startTime = new Date(event.startTime);
      
      // Round start time to nearest 15 minutes for fuzzy matching
      const roundedTime = new Date(startTime);
      roundedTime.setMinutes(Math.round(roundedTime.getMinutes() / 15) * 15, 0, 0);
      
      const signature = [
        ...teams.map(team => this.normalizeStringForDedup(team)),
        event.sport || 'unknown',
        roundedTime.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
      ].join('|');
      
      if (seen.has(signature)) {
        const originalIndex = seen.get(signature);
        const original = events[originalIndex];
        
        duplicates.push({
          signature,
          original: original.dataSource,
          duplicate: event.dataSource,
          originalEvent: original,
          duplicateEvent: event
        });
        
        // Prefer certain sources over others
        const priority = this.getSourcePriority(event.dataSource);
        const originalPriority = this.getSourcePriority(original.dataSource);
        
        if (priority > originalPriority) {
          // Replace the original with this one
          events[originalIndex] = event;
          logger.debug(`Replaced duplicate: ${original.dataSource} -> ${event.dataSource}`);
        }
        
        return false;
      }
      
      seen.set(signature, index);
      return true;
    });

    if (duplicates.length > 0) {
      logger.info(`Aggregator: Removed ${duplicates.length} duplicate events`);
      logger.debug('Duplicate events:', duplicates.map(d => ({
        signature: d.signature,
        sources: `${d.original} vs ${d.duplicate}`
      })));
    }

    // Log source breakdown after deduplication
    const finalSourceBreakdown = uniqueEvents.reduce((acc, event) => {
      acc[event.dataSource] = (acc[event.dataSource] || 0) + 1;
      return acc;
    }, {});
    logger.info(`Aggregator: Events by source after deduplication:`, finalSourceBreakdown);

    return uniqueEvents;
  }

  /**
   * Get source priority for deduplication (higher = preferred)
   */
  getSourcePriority(source) {
    const priorities = {
      '24media': 10,
      'gazzetta': 9
    };
    return priorities[source] || 1;
  }

  /**
   * Normalize string for deduplication matching
   */
  normalizeStringForDedup(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .replace(/\s+/g, ''); // Remove spaces
  }

  /**
   * Apply final filters after aggregation
   */
  applyFinalFilters(events, filters) {
    let filteredEvents = events;

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    // Sort by start time
    filteredEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return filteredEvents;
  }

  /**
   * Get aggregated metadata from all sources
   */
  async getMetadata() {
    const metadataPromises = Object.entries(this.scrapers).map(
      async ([name, scraper]) => {
        try {
          const metadata = await scraper.getMetadata();
          return { source: name, metadata };
        } catch (error) {
          logger.error(`Failed to get metadata from ${name}:`, error);
          return { source: name, metadata: null };
        }
      }
    );

    const results = await Promise.all(metadataPromises);
    
    // Merge metadata from all sources
    const merged = {
      sources: results.map(r => r.source),
      sports: new Set(),
      organizations: new Set(),
      teams: {}
    };

    results.forEach(({ source, metadata }) => {
      if (!metadata) return;

      // Merge sports
      if (metadata.sports) {
        metadata.sports.forEach(sport => merged.sports.add(sport));
      }

      // Merge organizations
      if (metadata.organizations) {
        metadata.organizations.forEach(org => merged.organizations.add(org));
      }

      // Merge teams by sport
      if (metadata.teams) {
        Object.entries(metadata.teams).forEach(([sport, teams]) => {
          if (!merged.teams[sport]) {
            merged.teams[sport] = new Set();
          }
          teams.forEach(team => merged.teams[sport].add(team));
        });
      }
    });

    // Convert Sets to Arrays
    return {
      sources: merged.sources,
      sports: Array.from(merged.sports),
      organizations: Array.from(merged.organizations),
      teams: Object.fromEntries(
        Object.entries(merged.teams).map(([sport, teamSet]) => [sport, Array.from(teamSet)])
      )
    };
  }

  /**
   * Get cache statistics for all scrapers
   */
  getCacheStats() {
    const stats = {};
    Object.entries(this.scrapers).forEach(([name, scraper]) => {
      if (typeof scraper.getCacheStats === 'function') {
        stats[name] = scraper.getCacheStats();
      }
    });
    return stats;
  }

  /**
   * Clear cache for specific scrapers or all
   */
  clearCache(sources = null) {
    const targetSources = sources || Object.keys(this.scrapers);
    
    targetSources.forEach(source => {
      if (this.scrapers[source] && typeof this.scrapers[source].clearCache === 'function') {
        this.scrapers[source].clearCache();
        logger.info(`Cleared cache for ${source}`);
      }
    });
  }

  /**
   * Get list of available scrapers
   */
  getAvailableScrapers() {
    return Object.keys(this.scrapers);
  }

  /**
   * Add a new scraper dynamically
   */
  addScraper(name, scraperInstance) {
    this.scrapers[name] = scraperInstance;
    logger.info(`Added scraper: ${name}`);
  }

  /**
   * Remove a scraper
   */
  removeScraper(name) {
    if (this.scrapers[name]) {
      delete this.scrapers[name];
      logger.info(`Removed scraper: ${name}`);
    }
  }
}

export default new SportsDataAggregator();
