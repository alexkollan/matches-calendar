/**
 * Advanced Filter Service
 * Handles complex keyword-based filtering with OR and NOT logic
 */

export class FilterService {
  
  /**
   * Apply advanced filters to events
   * @param {Array} events - Array of events to filter
   * @param {Array} filters - Array of filter objects
   * @returns {Array} Filtered events
   */
  static applyAdvancedFilters(events, filters) {
    if (!filters || filters.length === 0) return events;

    const enabledFilters = filters.filter(filter => filter.enabled);
    if (enabledFilters.length === 0) return events;

    const includeFilters = enabledFilters.filter(filter => filter.type === 'include');
    const excludeFilters = enabledFilters.filter(filter => filter.type === 'exclude');

    return events.filter(event => {
      // Step 1: Apply include filters (OR logic)
      // If we have include filters, event must match at least one
      if (includeFilters.length > 0) {
        const matchesInclude = includeFilters.some(filter => 
          this.matchesKeyword(event, filter)
        );
        if (!matchesInclude) return false;
      }

      // Step 2: Apply exclude filters (NOT logic)
      // Event must not match any exclude filter
      if (excludeFilters.length > 0) {
        const matchesExclude = excludeFilters.some(filter => 
          this.matchesKeyword(event, filter)
        );
        if (matchesExclude) return false;
      }

      return true;
    });
  }

  /**
   * Check if an event matches a keyword filter
   * @param {Object} event - Event object
   * @param {Object} filter - Filter object
   * @returns {Boolean} True if event matches the filter
   */
  static matchesKeyword(event, filter) {
    let keyword = filter.keyword;
    let searchableText = this.getSearchableText(event, true); // Always get original case first

    // Apply case sensitivity and accent normalization
    if (!filter.caseSensitive) {
      keyword = this.normalizeText(keyword);
      searchableText = this.normalizeText(searchableText);
    }

    if (filter.exactMatch) {
      // Exact word matching
      const words = searchableText.split(/\s+/);
      return words.some(word => word === keyword);
    } else {
      // Substring matching
      return searchableText.includes(keyword);
    }
  }

  /**
   * Normalize text for accent-insensitive and case-insensitive matching
   * @param {String} text - Text to normalize
   * @returns {String} Normalized text
   */
  static normalizeText(text) {
    if (!text) return '';
    
    return text
      .toLowerCase() // Convert to lowercase
      .normalize('NFD') // Decompose combined characters (e.g., ά -> α + ́)
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .replace(/[\u1F00-\u1FFF]/g, (char) => {
        // Handle Greek extended characters (polytonic Greek)
        // Map polytonic characters to their monotonic equivalents
        const polytonicToMonotonic = {
          'ἀ': 'α', 'ἁ': 'α', 'ἂ': 'α', 'ἃ': 'α', 'ἄ': 'α', 'ἅ': 'α', 'ἆ': 'α', 'ἇ': 'α',
          'ἐ': 'ε', 'ἑ': 'ε', 'ἒ': 'ε', 'ἓ': 'ε', 'ἔ': 'ε', 'ἕ': 'ε',
          'ἠ': 'η', 'ἡ': 'η', 'ἢ': 'η', 'ἣ': 'η', 'ἤ': 'η', 'ἥ': 'η', 'ἦ': 'η', 'ἧ': 'η',
          'ἰ': 'ι', 'ἱ': 'ι', 'ἲ': 'ι', 'ἳ': 'ι', 'ἴ': 'ι', 'ἵ': 'ι', 'ἶ': 'ι', 'ἷ': 'ι',
          'ὀ': 'ο', 'ὁ': 'ο', 'ὂ': 'ο', 'ὃ': 'ο', 'ὄ': 'ο', 'ὅ': 'ο',
          'ὐ': 'υ', 'ὑ': 'υ', 'ὒ': 'υ', 'ὓ': 'υ', 'ὔ': 'υ', 'ὕ': 'υ', 'ὖ': 'υ', 'ὗ': 'υ',
          'ὠ': 'ω', 'ὡ': 'ω', 'ὢ': 'ω', 'ὣ': 'ω', 'ὤ': 'ω', 'ὥ': 'ω', 'ὦ': 'ω', 'ὧ': 'ω',
          'ᾀ': 'α', 'ᾁ': 'α', 'ᾂ': 'α', 'ᾃ': 'α', 'ᾄ': 'α', 'ᾅ': 'α', 'ᾆ': 'α', 'ᾇ': 'α',
          'ᾐ': 'η', 'ᾑ': 'η', 'ᾒ': 'η', 'ᾓ': 'η', 'ᾔ': 'η', 'ᾕ': 'η', 'ᾖ': 'η', 'ᾗ': 'η',
          'ᾠ': 'ω', 'ᾡ': 'ω', 'ᾢ': 'ω', 'ᾣ': 'ω', 'ᾤ': 'ω', 'ᾥ': 'ω', 'ᾦ': 'ω', 'ᾧ': 'ω',
          'ὰ': 'α', 'ά': 'α', 'ᾰ': 'α', 'ᾱ': 'α', 'ᾲ': 'α', 'ᾳ': 'α', 'ᾴ': 'α', 'ᾶ': 'α', 'ᾷ': 'α',
          'ὲ': 'ε', 'έ': 'ε',
          'ὴ': 'η', 'ή': 'η', 'ῂ': 'η', 'ῃ': 'η', 'ῄ': 'η', 'ῆ': 'η', 'ῇ': 'η',
          'ὶ': 'ι', 'ί': 'ι', 'ῐ': 'ι', 'ῑ': 'ι', 'ῒ': 'ι', 'ΐ': 'ι', 'ῖ': 'ι', 'ῗ': 'ι',
          'ὸ': 'ο', 'ό': 'ο',
          'ὺ': 'υ', 'ύ': 'υ', 'ῠ': 'υ', 'ῡ': 'υ', 'ῢ': 'υ', 'ΰ': 'υ', 'ῦ': 'υ', 'ῧ': 'υ',
          'ὼ': 'ω', 'ώ': 'ω', 'ῲ': 'ω', 'ῳ': 'ω', 'ῴ': 'ω', 'ῶ': 'ω', 'ῷ': 'ω'
        };
        return polytonicToMonotonic[char] || char;
      });
  }

  /**
   * Extract searchable text from event
   * @param {Object} event - Event object
   * @param {Boolean} caseSensitive - Whether to preserve case
   * @returns {String} Concatenated searchable text
   */
  static getSearchableText(event, caseSensitive = false) {
    const textFields = [];

    // Event title
    if (event.title) {
      textFields.push(event.title);
    }

    // Team names (handle different data structures)
    if (event.homeTeam?.name) textFields.push(event.homeTeam.name);
    if (event.awayTeam?.name) textFields.push(event.awayTeam.name);
    if (event.teams && Array.isArray(event.teams)) {
      event.teams.forEach(team => {
        if (typeof team === 'string') textFields.push(team);
        if (team?.name) textFields.push(team.name);
      });
    }

    // League/Organization
    if (event.league?.name) textFields.push(event.league.name);
    if (event.organization) textFields.push(event.organization);

    // Sport
    if (event.sport?.name) textFields.push(event.sport.name);
    if (typeof event.sport === 'string') textFields.push(event.sport);

    // Event Type (important for filtering different types of events)
    if (event.type) textFields.push(event.type);
    if (event.eventType) textFields.push(event.eventType);
    if (event.category) textFields.push(event.category);

    // TV Channel (additional searchable field)
    if (event.tvChannel) textFields.push(event.tvChannel);

    // Description (if available)
    if (event.description) textFields.push(event.description);

    // Additional event metadata from tags (if available)
    if (event.tags && Array.isArray(event.tags)) {
      event.tags.forEach(tag => {
        if (tag.name) textFields.push(tag.name);
        if (tag.displayName) textFields.push(tag.displayName);
      });
    }

    // Classify event type automatically based on content
    const classifiedType = this.classifyEventType(event);
    textFields.push(classifiedType);

    // Join all text and process case sensitivity
    const combinedText = textFields.join(' ');
    return caseSensitive ? combinedText : combinedText.toLowerCase();
  }

  /**
   * Classify event type based on title and content
   * @param {Object} event - Event object
   * @returns {String} Event type classification
   */
  static classifyEventType(event) {
    const title = (event.title || '').toLowerCase();
    
    // TV Shows and Programs
    if (title.includes('show') || title.includes('pregame') || title.includes('postgame')) {
      return 'tv-show';
    }
    
    // Motor Sports
    if (title.includes('motogp') || title.includes('formula 1') || title.includes('f1') || 
        title.includes('moto2') || title.includes('moto3') || title.includes('moto-e') ||
        title.includes('wrc') || title.includes('dtm') || title.includes('erc')) {
      return 'motorsport';
    }
    
    // Basketball
    if (title.includes('nba') || title.includes('basketball') || title.includes('euroleague') ||
        title.includes('eurobasket') || event.sport === 'basketball') {
      return 'basketball';
    }
    
    // Football/Soccer
    if (event.sport === 'football' || event.sport === 'soccer' || 
        title.includes('uefa') || title.includes('champions league') || 
        title.includes('europa league') || title.includes('premier league') ||
        title.includes('liga') || title.includes('serie a') || title.includes('bundesliga')) {
      return 'football';
    }
    
    // Tennis
    if (title.includes('wta') || title.includes('atp') || title.includes('tennis') ||
        title.includes('wimbledon') || title.includes('roland garros') ||
        title.includes('us open') || title.includes('australian open')) {
      return 'tennis';
    }
    
    // Golf
    if (title.includes('pga') || title.includes('golf') || title.includes('masters')) {
      return 'golf';
    }
    
    // Combat Sports
    if (title.includes('ufc') || title.includes('boxing') || title.includes('mma') ||
        title.includes('oktagon') || title.includes('one friday fights')) {
      return 'combat-sports';
    }
    
    // Athletics
    if (title.includes('athletics') || title.includes('track') || title.includes('field') ||
        title.includes('marathon') || title.includes('world athletics')) {
      return 'athletics';
    }
    
    // Olympics/Paralympics
    if (title.includes('olympic') || title.includes('paralympic') || title.includes('tokyo 2025')) {
      return 'olympics';
    }
    
    // Generic Sports Match (team vs team pattern)
    if (title.includes(' vs ') || title.includes(' - ') || title.includes(' v ')) {
      return 'sports-match';
    }
    
    // News/Analysis Programs
    if (title.includes('news') || title.includes('analysis') || title.includes('highlights') ||
        title.includes('review') || title.includes('preview') || title.includes('live') ||
        title.includes('tonight') || title.includes('kick-off') || title.includes('matchday')) {
      return 'sports-program';
    }
    
    // Default classification
    return 'other-event';
  }

  /**
   * Get filter statistics for a set of events
   * @param {Array} events - Events to analyze
   * @param {Array} filters - Filters to test
   * @returns {Object} Statistics about filter effectiveness
   */
  static getFilterStats(events, filters) {
    if (!events || !filters) return null;

    const enabledFilters = filters.filter(filter => filter.enabled);
    if (enabledFilters.length === 0) {
      return {
        totalEvents: events.length,
        filteredEvents: events.length,
        removedEvents: 0,
        efficiency: 0,
        filterBreakdown: []
      };
    }

    const filteredEvents = this.applyAdvancedFilters(events, enabledFilters);
    const removedEvents = events.length - filteredEvents.length;
    const efficiency = events.length > 0 ? (removedEvents / events.length) * 100 : 0;

    // Get individual filter stats
    const filterBreakdown = enabledFilters.map(filter => {
      const matches = events.filter(event => this.matchesKeyword(event, filter));
      return {
        filterId: filter.id,
        keyword: filter.keyword,
        type: filter.type,
        matches: matches.length,
        percentage: events.length > 0 ? (matches.length / events.length) * 100 : 0
      };
    });

    return {
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
      removedEvents,
      efficiency,
      filterBreakdown
    };
  }

  /**
   * Suggest keywords based on event content
   * @param {Array} events - Events to analyze
   * @param {Number} minFrequency - Minimum occurrence count
   * @returns {Array} Suggested keywords with frequency data
   */
  static suggestKeywords(events, minFrequency = 2) {
    const wordCounts = new Map();
    
    events.forEach(event => {
      const text = this.getSearchableText(event, true); // Get original text first
      const normalizedText = this.normalizeText(text); // Then normalize for consistent suggestions
      const words = normalizedText.split(/\s+/)
        .map(word => word.replace(/[^\w]/g, ''))
        .filter(word => word.length > 2); // Only words with 3+ characters

      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= minFrequency)
      .map(([word, count]) => ({
        keyword: word,
        frequency: count,
        percentage: (count / events.length) * 100
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50); // Top 50 suggestions
  }

  /**
   * Validate filter configuration
   * @param {Object} filter - Filter to validate
   * @returns {Object} Validation result
   */
  static validateFilter(filter) {
    const errors = [];
    
    if (!filter.keyword || filter.keyword.trim().length === 0) {
      errors.push('Keyword cannot be empty');
    }
    
    if (filter.keyword && filter.keyword.length > 100) {
      errors.push('Keyword cannot exceed 100 characters');
    }
    
    if (!['include', 'exclude'].includes(filter.type)) {
      errors.push('Filter type must be either "include" or "exclude"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export filters to JSON
   * @param {Array} filters - Filters to export
   * @returns {String} JSON string
   */
  static exportFilters(filters) {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      filters: filters.map(filter => ({
        keyword: filter.keyword,
        type: filter.type,
        caseSensitive: filter.caseSensitive,
        exactMatch: filter.exactMatch,
        enabled: filter.enabled
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export filters to base64 encoded string
   * @param {Array} filters - Filters to export
   * @returns {String} Base64 encoded string
   */
  static exportFiltersAsString(filters) {
    const exportData = {
      v: '1.0', // Shortened keys to reduce size
      d: new Date().toISOString(),
      f: filters.map(filter => ({
        k: filter.keyword,
        t: filter.type,
        c: filter.caseSensitive,
        e: filter.exactMatch,
        n: filter.enabled
      }))
    };
    
    const jsonString = JSON.stringify(exportData);
    return btoa(unescape(encodeURIComponent(jsonString))); // Handle Unicode characters
  }

  /**
   * Import filters from base64 encoded string
   * @param {String} base64String - Base64 encoded string to import
   * @returns {Array} Imported filters
   */
  static importFiltersFromString(base64String) {
    try {
      const jsonString = decodeURIComponent(escape(atob(base64String))); // Handle Unicode characters
      const data = JSON.parse(jsonString);
      
      if (!data.f || !Array.isArray(data.f)) {
        throw new Error('Invalid filter format');
      }
      
      return data.f.map((filter, index) => ({
        id: Date.now() + index, // Generate new IDs
        keyword: filter.k || '',
        type: filter.t || 'include',
        caseSensitive: filter.c || false,
        exactMatch: filter.e || false,
        enabled: filter.n !== false, // Default to true
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      throw new Error(`Failed to import filters from string: ${error.message}`);
    }
  }

  /**
   * Import filters from JSON
   * @param {String} jsonString - JSON string to import
   * @returns {Array} Imported filters
   */
  static importFilters(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.filters || !Array.isArray(data.filters)) {
        throw new Error('Invalid filter format');
      }
      
      return data.filters.map((filter, index) => ({
        id: Date.now() + index, // Generate new IDs
        keyword: filter.keyword || '',
        type: filter.type || 'include',
        caseSensitive: filter.caseSensitive || false,
        exactMatch: filter.exactMatch || false,
        enabled: filter.enabled !== false, // Default to true
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      throw new Error(`Failed to import filters: ${error.message}`);
    }
  }
}

export default FilterService;
