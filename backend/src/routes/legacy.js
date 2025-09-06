import express from 'express';
import scraperAggregator from '../services/scrapers/index.js';
import { logger } from '../utils/logger.js';
import { createHash } from '../utils/hash.js';

const router = express.Router();

// Cache for storing schedule and teams data (separate for each source)
const cache = {
  gazzetta: {
    schedule: null,
    teams: null,
    lastFetchTime: null
  },
  media24: {
    schedule: null,
    teams: null,
    lastFetchTime: null
  }
};

const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Helper function to create hash for match IDs
function createMatchHash(details) {
  const hashInput = `${details.title}-${details.date}-${details.time}`;
  return createHash(hashInput);
}

// Function to transform new event format to old format
function transformNewEventsToLegacy(events, source) {
  const matches = [];
  const allTeams = new Set();

  events.forEach(event => {
    // Collect all teams
    if (event.teams && Array.isArray(event.teams)) {
      event.teams.forEach(team => {
        if (team) allTeams.add(team);
      });
    }

    // Format date from ISO string
    const eventDate = new Date(event.startTime);
    const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')}/${(eventDate.getMonth() + 1).toString().padStart(2, '0')}/${eventDate.getFullYear()}`;
    
    // Format time from ISO string
    const formattedTime = eventDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Build participants array
    const participants = event.teams && Array.isArray(event.teams) 
      ? event.teams.slice(0, 2) 
      : ["N/A", "N/A"];

    // Ensure we have at least 2 participants
    while (participants.length < 2) {
      participants.push("N/A");
    }

    const details = {
      title: event.title || `${participants[0]} - ${participants[1]} (${event.sport})`,
      participants: participants,
      date: formattedDate,
      channel: event.venue || event.channel || "N/A",
      time: formattedTime,
      league: event.organization || "N/A",
      sport: event.sport || "N/A",
      source: source
    };
    details.id = createMatchHash(details);
    matches.push(details);
  });

  return { matches, allTeams: Array.from(allTeams) };
}

// Function to fetch data by source
async function fetchDataBySource(source) {
  if (source === 'gazzetta') {
    const result = await scraperAggregator.fetchEvents(['gazzetta']);
    return transformNewEventsToLegacy(result.events, 'gazzetta');
  } else if (source === 'media24') {
    const result = await scraperAggregator.fetchEvents(['24media']);
    return transformNewEventsToLegacy(result.events, 'media24');
  } else {
    throw new Error(`Unknown data source: ${source}`);
  }
}

/**
 * GET /api/teams
 * Get all teams from specified source
 */
router.get('/teams', async (req, res) => {
  try {
    const source = req.query.source || 'gazzetta';
    logger.info(`/api/teams endpoint called with source: ${source}`);
    
    const currentTime = Date.now();
    const sourceCache = cache[source];

    // Check if teams cache is valid
    if (sourceCache.teams && sourceCache.lastFetchTime && 
        (currentTime - sourceCache.lastFetchTime < CACHE_DURATION)) {
      logger.info(`[${source.toUpperCase()}] Teams: Using cached data (age: ${Math.round((currentTime - sourceCache.lastFetchTime)/1000)}s)`);
      return res.json(sourceCache.teams);
    }

    logger.info(`[${source.toUpperCase()}] Teams: Fetching fresh data`);
    const { allTeams } = await fetchDataBySource(source);

    // Update cache
    sourceCache.teams = allTeams;
    sourceCache.lastFetchTime = currentTime;

    res.json(allTeams);
  } catch (error) {
    logger.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * GET /api/leagues
 * Get all leagues from specified source
 */
router.get('/leagues', async (req, res) => {
  try {
    const source = req.query.source || 'gazzetta';
    logger.info(`/api/leagues endpoint called with source: ${source}`);
    
    const currentTime = Date.now();
    const sourceCache = cache[source];

    // Check if schedule cache is valid for extracting leagues
    if (sourceCache.schedule && sourceCache.lastFetchTime && 
        (currentTime - sourceCache.lastFetchTime < CACHE_DURATION)) {
      logger.info(`[${source.toUpperCase()}] Leagues: Using cached data`);
      // Extract leagues from cached schedule data
      const leagues = new Set();
      sourceCache.schedule.forEach(match => {
        if (match.league && match.league !== 'N/A') {
          leagues.add(match.league);
        }
      });
      return res.json(Array.from(leagues).sort());
    }

    logger.info(`[${source.toUpperCase()}] Leagues: Fetching fresh data`);
    const { matches } = await fetchDataBySource(source);

    // Update cache
    sourceCache.schedule = matches;
    sourceCache.lastFetchTime = currentTime;

    // Extract leagues
    const leagues = new Set();
    matches.forEach(match => {
      if (match.league && match.league !== 'N/A') {
        leagues.add(match.league);
      }
    });

    res.json(Array.from(leagues).sort());
  } catch (error) {
    logger.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

/**
 * POST /api/schedule
 * Get filtered matches based on selected teams and leagues
 */
router.post('/schedule', async (req, res) => {
  try {
    const { selectedTeams, selectedLeagues, source = 'gazzetta' } = req.body;
    logger.info(`/api/schedule endpoint called with source: ${source}`);

    if ((!selectedTeams || !Array.isArray(selectedTeams)) && 
        (!selectedLeagues || !Array.isArray(selectedLeagues))) {
      return res.status(400).json({ error: 'Invalid or missing parameters' });
    }

    const currentTime = Date.now();
    const sourceCache = cache[source];

    // Check if schedule cache is valid
    if (sourceCache.schedule && sourceCache.lastFetchTime && 
        (currentTime - sourceCache.lastFetchTime < CACHE_DURATION)) {
      logger.info(`Returning cached schedule data from ${source}`);
    } else {
      logger.info(`Fetching fresh schedule data from ${source}`);
      const { matches } = await fetchDataBySource(source);

      // Update cache
      sourceCache.schedule = matches;
      sourceCache.lastFetchTime = currentTime;
    }

    // Filter matches based on selected teams and leagues
    let filteredMatches = sourceCache.schedule;
    
    if (selectedTeams && selectedTeams.length > 0) {
      filteredMatches = filteredMatches.filter(match =>
        selectedTeams.some(team => match.participants.includes(team))
      );
    }
    
    if (selectedLeagues && selectedLeagues.length > 0) {
      filteredMatches = filteredMatches.filter(match =>
        selectedLeagues.includes(match.league)
      );
    }

    res.json(filteredMatches);
  } catch (error) {
    logger.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

export default router;
