import axios from 'axios';
import NodeCache from 'node-cache';
import { logger } from '../../utils/logger.js';
import { AppConstants } from '../../../../shared/types.js';

/**
 * Base class for all sports data scrapers
 * Provides common functionality like caching, rate limiting, and error handling
 */
export class BaseScraper {
  constructor(config) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.rateLimit = config.rateLimit || 10; // requests per minute
    this.cacheTime = config.cacheTime || AppConstants.CACHE_TTL;
    this.headers = config.headers || {};
    
    // Initialize cache
    this.cache = new NodeCache({ 
      stdTTL: this.cacheTime,
      checkperiod: 120 
    });
    
    // Request queue for rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    
    // Axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9,el;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...this.headers
      }
    });
    
    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      config => this.rateLimitRequest(config),
      error => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleRequestError(error)
    );
  }
  
  /**
   * Rate limit requests to avoid being blocked
   */
  async rateLimitRequest(config) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minTimeBetweenRequests = 60000 / this.rateLimit;
    
    if (timeSinceLastRequest < minTimeBetweenRequests) {
      const delay = minTimeBetweenRequests - timeSinceLastRequest;
      logger.debug(`Rate limiting ${this.name}: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
    return config;
  }

  /**
   * Handle request errors with proper logging
   */
  handleRequestError(error) {
    if (error.response) {
      // Server responded with error status
      logger.error(`${this.name} HTTP error:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url
      });
    } else if (error.request) {
      // Request was made but no response
      logger.error(`${this.name} network error:`, {
        message: error.message,
        url: error.config?.url
      });
    } else {
      // Something else happened
      logger.error(`${this.name} request error:`, error.message);
    }
    return Promise.reject(error);
  }
  
  /**
   * Get cache key for a request
   */
  getCacheKey(endpoint, params = {}) {
    const paramStr = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return `${this.name}:${endpoint}:${paramStr}`;
  }
  
  /**
   * Make a cached request
   */
  async cachedRequest(endpoint, params = {}, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }
    
    // Make request
    try {
      logger.debug(`Making request to ${this.name}: ${endpoint}`);
      const response = await this.client.get(endpoint, { params, ...options });
      
      // Cache the response data
      this.cache.set(cacheKey, response.data, this.cacheTime);
      
      return response.data;
    } catch (error) {
      logger.error(`Request failed for ${this.name}:`, error.message);
      throw new Error(`Failed to fetch from ${this.name}: ${error.message}`);
    }
  }
  
  /**
   * Abstract method - must be implemented by subclasses
   * Fetch events for a specific date range
   */
  async fetchEvents(startDate, endDate, filters = {}) {
    throw new Error('fetchEvents must be implemented by subclass');
  }
  
  /**
   * Abstract method - must be implemented by subclasses
   * Parse raw data into standardized event format
   */
  parseEvents(rawData, filters = {}) {
    throw new Error('parseEvents must be implemented by subclass');
  }
  
  /**
   * Get available teams/organizations/sports metadata
   */
  async getMetadata() {
    throw new Error('getMetadata must be implemented by subclass');
  }
  
  /**
   * Validate and sanitize event data
   */
  validateEvent(event) {
    const required = ['id', 'title', 'startTime', 'endTime', 'teams', 'sport'];
    for (const field of required) {
      if (!event[field]) {
        logger.warn(`Invalid event missing ${field}:`, event);
        return false;
      }
    }

    // Validate dates
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      logger.warn('Invalid event dates:', event);
      return false;
    }

    if (startTime >= endTime) {
      logger.warn('Event end time must be after start time:', event);
      return false;
    }

    return true;
  }

  /**
   * Generate unique event ID
   */
  generateEventId(event) {
    let timeComponent;
    
    try {
      const date = new Date(event.startTime);
      if (isNaN(date.getTime())) {
        timeComponent = 'invalid-date';
      } else {
        timeComponent = date.toISOString().slice(0, 16);
      }
    } catch (error) {
      timeComponent = 'invalid-date';
    }
    
    const components = [
      this.name,
      event.sport || 'unknown',
      ...(event.teams || []).sort(),
      timeComponent
    ];
    
    // Add external ID if available for uniqueness
    if (event.externalId) {
      components.push(event.externalId);
    }
    
    return components
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-');
  }

  /**
   * Normalize team names for consistent matching
   */
  normalizeString(str) {
    if (!str) return '';
    return str
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .toLowerCase();
  }

  /**
   * Calculate event end time based on sport
   */
  calculateEndTime(startTime, sport, durationOverride = null) {
    const durationMinutes = durationOverride || this.getDefaultDuration(sport);
    return new Date(new Date(startTime).getTime() + durationMinutes * 60000);
  }

  /**
   * Get default event duration by sport
   */
  getDefaultDuration(sport) {
    const durations = {
      football: 180,     // 3 hours
      basketball: 150,   // 2.5 hours
      soccer: 120,       // 2 hours
      baseball: 180,     // 3 hours
      hockey: 150,       // 2.5 hours
      tennis: 180,       // 3 hours
      default: 120       // 2 hours
    };
    
    return durations[sport.toLowerCase()] || durations.default;
  }

  /**
   * Clear cache for this scraper
   */
  clearCache() {
    const keys = this.cache.keys();
    const scraperKeys = keys.filter(key => key.startsWith(`${this.name}:`));
    scraperKeys.forEach(key => this.cache.del(key));
    logger.info(`Cleared ${scraperKeys.length} cache entries for ${this.name}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().filter(key => key.startsWith(`${this.name}:`)).length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses
    };
  }
}
