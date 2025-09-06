import { BaseScraper } from './BaseScraper.js';
import { GreekTeams, GreekLeagues } from '../../../../shared/types.js';
import { logger } from '../../utils/logger.js';

/**
 * Gazzetta scraper implementation
 * Integrates with existing Gazzetta logic from the original project
 */
export class GazzettaScraper extends BaseScraper {
  constructor() {
    super({
      name: 'gazzetta',
      baseUrl: 'https://www.gazzetta.gr',
      rateLimit: 15, // 15 requests per minute
      cacheTime: 900, // 15 minutes
      headers: {
        'Referer': 'https://www.gazzetta.gr/',
        'Accept': 'application/json'
      }
    });

    // Import configuration from existing project
    this.teams = [
      ...GreekTeams.basketball,
      ...GreekTeams.football
    ];
    this.leagueExclusions = ["Γυναικών"];
  }

  /**
   * Fetch events from Gazzetta API
   */
  async fetchEvents(startDate = null, endDate = null, filters = {}) {
    try {
      const endpoint = '/gztfeeds/tvschedule-v2';
      
      logger.info('Fetching Gazzetta TV schedule');
      const data = await this.cachedRequest(endpoint);
      
      if (!data || !data.dates) {
        logger.warn('Gazzetta returned invalid data structure:', data);
        return [];
      }

      const events = this.parseEvents(data, filters, startDate, endDate);
      logger.info(`Gazzetta: Found ${events.length} events after filtering`);
      
      return events;
    } catch (error) {
      logger.error('Gazzetta fetch failed:', error);
      return [];
    }
  }

  /**
   * Parse and filter Gazzetta events
   */
  parseEvents(rawData, filters = {}, startDate = null, endDate = null) {
    if (!rawData || !rawData.dates) {
      logger.warn('Gazzetta parseEvents: Invalid data format');
      return [];
    }

    const events = [];
    const currentYear = new Date().getFullYear();
    const now = new Date();
    // Set to start of today to include all events from today onwards
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Process each day's events
    for (const day in rawData.dates) {
      const dayData = rawData.dates[day];
      if (!dayData.events || !Array.isArray(dayData.events)) {
        continue;
      }

      // Parse the date (format: DD/MM)
      const [dayNum, monthNum] = day.split('/');
      const eventDate = new Date(currentYear, parseInt(monthNum) - 1, parseInt(dayNum));

      // Apply date range filter
      if (startDate && eventDate < new Date(startDate)) continue;
      if (endDate && eventDate > new Date(endDate)) continue;
      
      // Filter out past events - only show events from today onwards
      if (eventDate < startOfToday) {
        logger.debug(`Filtering out past day: ${day} (${eventDate.toISOString()})`);
        continue;
      }

      for (const match of dayData.events) {
        try {
          // Apply existing filtering logic (disabled - frontend will handle filtering)
          // if (!this.passesBasicFilter(match)) {
          //   continue;
          // }

          // Apply additional filters (disabled - frontend will handle filtering)
          // if (!this.passesAdditionalFilters(match, filters)) {
          //   continue;
          // }

          const event = this.normalizeEvent(match, eventDate);
          if (this.validateEvent(event)) {
            events.push(event);
          }
        } catch (error) {
          logger.error('Error parsing Gazzetta event:', error, match);
        }
      }
    }

    return events;
  }

  /**
   * Check if event passes basic filter (existing logic)
   */
  passesBasicFilter(match) {
    // Check sport
    if (!match.sport_name || 
        (match.sport_name !== "Ποδόσφαιρο" && match.sport_name !== "Μπάσκετ")) {
      return false;
    }

    // Check teams
    const hasTeam = this.teams.some(team => 
      match.participant1?.name?.includes(team) || 
      match.participant2?.name?.includes(team)
    );

    if (!hasTeam) {
      return false;
    }

    // Check league exclusions
    const hasExcludedLeague = this.leagueExclusions.some(exclusion =>
      match.league?.name?.includes(exclusion)
    );

    return !hasExcludedLeague;
  }

  /**
   * Apply additional filters from user preferences
   */
  passesAdditionalFilters(match, filters) {
    // Sport filter
    if (filters.sports && filters.sports.length > 0) {
      const eventSport = this.mapSportName(match.sport_name);
      if (!filters.sports.includes(eventSport)) {
        return false;
      }
    }

    // Organization filter
    if (filters.organizations && filters.organizations.length > 0) {
      const leagueName = match.league?.name || 'Unknown';
      if (!filters.organizations.includes(leagueName)) {
        return false;
      }
    }

    // Team filter (more specific than default)
    if (filters.teams && filters.teams.length > 0) {
      const participant1 = this.normalizeString(match.participant1?.name || '');
      const participant2 = this.normalizeString(match.participant2?.name || '');
      
      const hasFilteredTeam = filters.teams.some(team => {
        const normalizedTeam = this.normalizeString(team);
        return participant1.includes(normalizedTeam) || participant2.includes(normalizedTeam);
      });
      
      if (!hasFilteredTeam) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert Gazzetta event to standardized format
   */
  normalizeEvent(rawMatch, eventDate) {
    const startTime = this.parseEventDateTime(eventDate, rawMatch.plainTime);
    const sport = this.mapSportName(rawMatch.sport_name);
    const endTime = this.calculateEndTime(startTime, sport);

    const teams = this.extractTeams(rawMatch);
    const title = this.buildTitle(rawMatch);

    const event = {
      id: this.generateEventId({
        title: title,
        startTime: startTime,
        teams: teams,
        sport: sport
      }),
      externalId: rawMatch.id?.toString() || this.generateExternalId(rawMatch),
      title: title,
      description: this.buildDescription(rawMatch),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      teams: teams,
      organization: rawMatch.league?.name || 'Unknown',
      sport: sport,
      dataSource: 'gazzetta',
      venue: rawMatch.venue?.name || '',
      broadcastInfo: this.extractBroadcastInfo(rawMatch),
      status: 'scheduled',
      metadata: {
        originalEvent: rawMatch,
        sportName: rawMatch.sport_name
      }
    };

    return event;
  }

  /**
   * Parse event date and time
   */
  parseEventDateTime(eventDate, timeString) {
    if (!timeString) {
      return eventDate;
    }

    // Parse time (format: "HH:mm" or similar)
    const timeParts = timeString.match(/(\d{1,2}):(\d{2})/);
    if (timeParts) {
      const hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      
      const dateTime = new Date(eventDate);
      dateTime.setHours(hours, minutes, 0, 0);
      
      return dateTime;
    }

    return eventDate;
  }

  /**
   * Map Greek sport names to standardized format
   */
  mapSportName(sportName) {
    const mapping = {
      'Ποδόσφαιρο': 'football',
      'Μπάσκετ': 'basketball',
      'Τένις': 'tennis',
      'Βόλεϊ': 'volleyball'
    };

    return mapping[sportName] || 'other';
  }

  /**
   * Extract team information
   */
  extractTeams(match) {
    const teams = [];
    
    if (match.participant1?.name) {
      teams.push({
        name: match.participant1.name.trim(),
        isHome: false
      });
    }
    
    if (match.participant2?.name) {
      teams.push({
        name: match.participant2.name.trim(),
        isHome: true
      });
    }

    // Return just team names for backwards compatibility
    return teams.map(team => team.name);
  }

  /**
   * Build event title
   */
  buildTitle(match) {
    const participant1 = match.participant1?.name || 'Team 1';
    const participant2 = match.participant2?.name || 'Team 2';
    const sport = match.sport_name ? ` (${match.sport_name})` : '';
    
    return `${participant1} - ${participant2}${sport}`;
  }

  /**
   * Extract broadcast information
   */
  extractBroadcastInfo(match) {
    const broadcasts = [];
    
    if (match.channel1?.name) {
      broadcasts.push({
        network: match.channel1.name,
        type: 'tv'
      });
    }

    if (match.channel2?.name) {
      broadcasts.push({
        network: match.channel2.name,
        type: 'tv'
      });
    }

    return broadcasts;
  }

  /**
   * Build event description
   */
  buildDescription(match) {
    const parts = [];
    
    if (match.league?.name) {
      parts.push(`League: ${match.league.name}`);
    }
    
    if (match.venue?.name) {
      parts.push(`Venue: ${match.venue.name}`);
    }
    
    const broadcasts = this.extractBroadcastInfo(match);
    if (broadcasts.length > 0) {
      const channels = broadcasts.map(b => b.network).join(', ');
      parts.push(`Broadcasting on: ${channels}`);
    }

    if (match.description) {
      parts.push(match.description);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate external ID for events without one
   */
  generateExternalId(match) {
    const components = [
      match.participant1?.name || '',
      match.participant2?.name || '',
      match.sport_name || '',
      match.plainTime || ''
    ];
    
    return this.normalizeString(components.join('-'));
  }

  /**
   * Get metadata about available content
   */
  async getMetadata() {
    try {
      return {
        sports: ['football', 'basketball', 'tennis', 'volleyball', 'other'],
        organizations: GreekLeagues,
        teams: {
          basketball: GreekTeams.basketball,
          football: GreekTeams.football
        },
        dataSource: 'gazzetta'
      };
    } catch (error) {
      logger.error('Error getting Gazzetta metadata:', error);
      return {
        sports: [],
        organizations: [],
        teams: {},
        dataSource: 'gazzetta'
      };
    }
  }
}
