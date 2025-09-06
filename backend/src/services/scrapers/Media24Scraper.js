import { BaseScraper } from './BaseScraper.js';
import { GreekTeams, GreekLeagues, GreekSports } from '../../../../shared/types.js';
import { logger } from '../../utils/logger.js';

/**
 * 24Media scraper implementation
 * Integrates with existing 24Media logic from the original project
 */
export class Media24Scraper extends BaseScraper {
  constructor() {
    super({
      name: '24media',
      baseUrl: 'https://tv.24media.gr',
      rateLimit: 20, // 20 requests per minute
      cacheTime: 600, // 10 minutes
      headers: {
        'Referer': 'https://tv.24media.gr/',
        'Accept': 'application/json'
      }
    });

    // Import configuration from existing project
    this.teams = [
      ...GreekTeams.basketball,
      ...GreekTeams.football
    ];
    this.leagues = GreekLeagues;
    this.sports = GreekSports;
    this.leagueExclusions = ["Γυναικών"];
  }

  /**
   * Fetch events from 24Media API
   */
  async fetchEvents(startDate = null, endDate = null, filters = {}) {
    try {
      const today = startDate ? this.formatDate(startDate) : this.formatDate(new Date());
      const days = endDate ? this.calculateDaysDiff(startDate, endDate) : 7;
      
      const endpoint = '/service/events';
      const params = {
        accept: 'json',
        date: today,
        days: Math.min(days, 30), // Limit to 30 days max
        pId: 3
      };

      logger.info(`Fetching 24Media events from ${today} for ${days} days`);
      const data = await this.cachedRequest(endpoint, params);
      
      if (!Array.isArray(data)) {
        logger.warn('24Media returned non-array data:', data);
        return [];
      }

      const events = this.parseEvents(data, filters);
      logger.info(`24Media: Found ${events.length} events after filtering`);
      
      return events;
    } catch (error) {
      logger.error('24Media fetch failed:', error);
      return [];
    }
  }

  /**
   * Parse and filter 24Media events
   */
  parseEvents(rawData, filters = {}) {
    if (!Array.isArray(rawData)) {
      logger.warn('24Media parseEvents: Invalid data format');
      return [];
    }

    const events = [];
    const now = new Date();
    // Set to start of today to include all events from today onwards
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const item of rawData) {
      try {
        // Apply existing filtering logic (disabled - frontend will handle filtering)
        // if (!this.passesTeamFilter(item) || !this.passesLeagueFilter(item)) {
        //   continue;
        // }

        // Apply additional filters (disabled - frontend will handle filtering)
        // if (!this.passesAdditionalFilters(item, filters)) {
        //   continue;
        // }

        const event = this.normalizeEvent(item);
        if (!this.validateEvent(event)) {
          continue;
        }

        // Filter out past events - only show events from today onwards
        const eventDate = new Date(event.startTime);
        if (eventDate < startOfToday) {
          logger.debug(`Filtering out past event: ${event.title} (${eventDate.toISOString()})`);
          continue;
        }

        events.push(event);
      } catch (error) {
        logger.error('Error parsing 24Media event:', error, item);
      }
    }

    return events;
  }

  /**
   * Check if event passes team filter (existing logic)
   */
  passesTeamFilter(event) {
    const normalizedTitle = this.normalizeString(event.title);
    return this.teams.some(team => 
      normalizedTitle.includes(this.normalizeString(team))
    );
  }

  /**
   * Check if event passes league filter (existing logic)
   */
  passesLeagueFilter(event) {
    if (!event.tags || !Array.isArray(event.tags)) {
      return false;
    }

    // Check if event has valid sport tags
    const hasSportTag = event.tags.some(tag =>
      this.sports.some(sport =>
        this.normalizeString(tag.name).includes(this.normalizeString(sport))
      )
    );

    if (!hasSportTag) {
      return false;
    }

    // Check for league exclusions
    const hasExcludedLeague = event.tags.some(tag =>
      this.leagueExclusions.some(exclusion =>
        this.normalizeString(tag.name).includes(this.normalizeString(exclusion))
      )
    );

    return !hasExcludedLeague;
  }

  /**
   * Apply additional filters from user preferences
   */
  passesAdditionalFilters(event, filters) {
    // Sport filter
    if (filters.sports && filters.sports.length > 0) {
      const eventSport = this.determineSport(event);
      if (!filters.sports.includes(eventSport)) {
        return false;
      }
    }

    // Organization filter
    if (filters.organizations && filters.organizations.length > 0) {
      const eventOrg = this.determineOrganization(event);
      if (!filters.organizations.includes(eventOrg)) {
        return false;
      }
    }

    // Team filter (more specific than default)
    if (filters.teams && filters.teams.length > 0) {
      const normalizedTitle = this.normalizeString(event.title);
      const hasFilteredTeam = filters.teams.some(team =>
        normalizedTitle.includes(this.normalizeString(team))
      );
      if (!hasFilteredTeam) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert 24Media event to standardized format
   */
  normalizeEvent(rawEvent) {
    // Handle different date formats from 24Media
    let startTime;
    
    // Priority order for date parsing
    if (rawEvent.scheduleDate) {
      // Direct scheduleDate field (format: "2025-09-11 14:00:00")
      startTime = new Date(rawEvent.scheduleDate);
    } else if (rawEvent.startDate) {
      startTime = new Date(rawEvent.startDate);
    } else if (rawEvent.dateView && rawEvent.timeView) {
      // Parse dateView (e.g., "2025-09-11") and timeView (e.g., "14:00")
      const dateParts = rawEvent.dateView.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateParts[2]);
        
        const timeParts = rawEvent.timeView ? rawEvent.timeView.split(':') : ['00', '00'];
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        
        startTime = new Date(year, month, day, hours, minutes);
      } else {
        // Try alternative date format parsing (DD/MM/YYYY)
        const alternativeParts = rawEvent.dateView.split('/');
        if (alternativeParts.length === 3) {
          const day = parseInt(alternativeParts[0]);
          const month = parseInt(alternativeParts[1]) - 1;
          const year = parseInt(alternativeParts[2]);
          
          const timeParts = rawEvent.timeView ? rawEvent.timeView.split(':') : ['00', '00'];
          const hours = parseInt(timeParts[0]) || 0;
          const minutes = parseInt(timeParts[1]) || 0;
          
          startTime = new Date(year, month, day, hours, minutes);
        }
      }
    }
    
    // If we still don't have a valid date, try to parse it as a string
    if (!startTime || isNaN(startTime.getTime())) {
      if (rawEvent.scheduleDate) {
        // Try parsing the scheduleDate with different formats
        const scheduleStr = rawEvent.scheduleDate.toString();
        startTime = new Date(scheduleStr);
        
        if (isNaN(startTime.getTime())) {
          // Try parsing as "YYYY-MM-DD HH:mm:ss" format
          const match = scheduleStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
          if (match) {
            const [, year, month, day, hours, minutes, seconds] = match;
            startTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                                parseInt(hours), parseInt(minutes), parseInt(seconds));
          }
        }
      }
    }
    
    // Validate the date - if still invalid, use a date 1 week from now as fallback
    if (!startTime || isNaN(startTime.getTime())) {
      logger.warn('Invalid date in 24Media event, using fallback:', rawEvent);
      startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    }
    
    const endTime = rawEvent.endDate ? new Date(rawEvent.endDate) : 
                   new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours duration
    
    // If end time is not provided or invalid, calculate it
    if (isNaN(endTime.getTime()) || endTime <= startTime) {
      const sport = this.determineSport(rawEvent);
      endTime.setTime(this.calculateEndTime(startTime, sport).getTime());
    }

    const teams = this.extractTeams(rawEvent.title);
    const sport = this.determineSport(rawEvent);
    const organization = this.determineOrganization(rawEvent);
    const externalId = rawEvent.id?.toString() || rawEvent.eventId?.toString();

    const event = {
      id: this.generateEventId({
        title: rawEvent.title,
        startTime: startTime,
        teams: teams,
        sport: sport,
        externalId: externalId
      }),
      externalId: externalId,
      title: rawEvent.title.trim(),
      description: this.buildDescription(rawEvent),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      teams: teams,
      organization: organization,
      sport: sport,
      dataSource: '24media',
      venue: rawEvent.location || '',
      broadcastInfo: this.extractBroadcastInfo(rawEvent),
      tvChannel: this.extractTVChannel(rawEvent),
      status: 'scheduled',
      metadata: {
        originalEvent: rawEvent,
        tags: rawEvent.tags || []
      }
    };

    // Info: Log the final event with TV channel info
    logger.info('Normalized event with TV channel:', {
      eventId: event.id,
      title: event.title,
      tvChannel: event.tvChannel,
      hasTvChannel: !!event.tvChannel
    });

    return event;
  }

  /**
   * Extract team names from title
   */
  extractTeams(title) {
    // Common patterns: "Team1 - Team2", "Team1 vs Team2", "Team1 Team2"
    const separators = [' - ', ' vs ', ' VS ', ' v ', ' V '];
    
    for (const separator of separators) {
      if (title.includes(separator)) {
        return title.split(separator).map(team => team.trim());
      }
    }

    // If no separator found, try to identify known teams
    const foundTeams = [];
    for (const team of this.teams) {
      if (this.normalizeString(title).includes(this.normalizeString(team))) {
        foundTeams.push(team);
      }
    }

    // If we found teams, return them, otherwise return the full title
    return foundTeams.length > 0 ? foundTeams : [title.trim()];
  }

  /**
   * Determine sport from event data
   */
  determineSport(event) {
    if (!event.tags || !Array.isArray(event.tags)) {
      return 'other';
    }

    const tagNames = event.tags.map(tag => this.normalizeString(tag.name)).join(' ');

    if (tagNames.includes('basket') || tagNames.includes('mpasket')) {
      return 'basketball';
    }
    if (tagNames.includes('football') || tagNames.includes('podosfairo')) {
      return 'football';
    }
    if (tagNames.includes('soccer')) {
      return 'soccer';
    }
    if (tagNames.includes('tennis')) {
      return 'tennis';
    }
    if (tagNames.includes('volleyball')) {
      return 'volleyball';
    }

    return 'other';
  }

  /**
   * Determine organization/league from event data
   */
  determineOrganization(event) {
    if (!event.tags || !Array.isArray(event.tags)) {
      return 'Unknown';
    }

    const tagNames = event.tags.map(tag => tag.name);
    
    for (const league of this.leagues) {
      if (tagNames.some(tag => 
        this.normalizeString(tag).includes(this.normalizeString(league))
      )) {
        return league;
      }
    }

    // Return the first non-sport tag as organization
    const sportTags = this.sports;
    const nonSportTag = event.tags.find(tag => 
      !sportTags.some(sport => 
        this.normalizeString(tag.name).includes(this.normalizeString(sport))
      )
    );

    return nonSportTag ? nonSportTag.name : 'Unknown';
  }

  /**
   * Extract broadcast information
   */
  extractBroadcastInfo(event) {
    const broadcasts = [];
    
    // Check for channel info in the new format
    if (event.channel && event.channel.name) {
      broadcasts.push({
        network: event.channel.name,
        type: 'tv',
        channelId: event.channel.id,
        feedEntryId: event.channel.feedEntryId
      });
    }
    
    // Fallback to old format
    if (event.channelName) {
      broadcasts.push({
        network: event.channelName,
        type: 'tv'
      });
    }

    if (event.tags) {
      event.tags.forEach(tag => {
        if (tag.name && tag.name.toLowerCase().includes('streaming')) {
          broadcasts.push({
            network: tag.name,
            type: 'streaming'
          });
        }
      });
    }

    return broadcasts;
  }

  /**
   * Extract TV channel name for easy access
   */
  extractTVChannel(event) {
    // Info: Log the event structure to see what we're working with
    logger.info('Extracting TV channel from event:', {
      eventId: event.id,
      title: event.title,
      hasChannel: !!event.channel,
      channelName: event.channel?.name,
      hasChannelName: !!event.channelName,
      channelNameValue: event.channelName
    });
    
    // Check for channel info in the new format
    if (event.channel && event.channel.name) {
      logger.info('Found TV channel from channel.name:', event.channel.name);
      return event.channel.name;
    }
    
    // Fallback to old format
    if (event.channelName) {
      logger.info('Found TV channel from channelName:', event.channelName);
      return event.channelName;
    }

    logger.info('No TV channel found for event:', event.title);
    return null;
  }

  /**
   * Build event description
   */
  buildDescription(event) {
    const parts = [];
    
    if (event.description) {
      parts.push(event.description);
    }
    
    if (event.tags && event.tags.length > 0) {
      const tagNames = event.tags.map(tag => tag.name).join(', ');
      parts.push(`Categories: ${tagNames}`);
    }
    
    // Check for channel info in the new format
    if (event.channel && event.channel.name) {
      parts.push(`Broadcasting on: ${event.channel.name}`);
    } else if (event.channelName) {
      parts.push(`Broadcasting on: ${event.channelName}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Get metadata about available content
   */
  async getMetadata() {
    try {
      // For 24Media, we return static metadata based on configuration
      return {
        sports: ['basketball', 'football', 'soccer', 'tennis', 'other'],
        organizations: this.leagues,
        teams: {
          basketball: GreekTeams.basketball,
          football: GreekTeams.football
        },
        dataSource: '24media'
      };
    } catch (error) {
      logger.error('Error getting 24Media metadata:', error);
      return {
        sports: [],
        organizations: [],
        teams: {},
        dataSource: '24media'
      };
    }
  }

  /**
   * Helper methods
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  calculateDaysDiff(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
