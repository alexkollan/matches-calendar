import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

import { createHash } from './src/utils.js';
import { authorize } from './src/auth.js';
import { addEvent } from './src/calendar.js';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Helper function to get today's date in YYYY-MM-DD format
function today() {
  const today = new Date();
  const formatted = today.toISOString().split('T')[0];
  return formatted;
}

// Helper function to get the first sentence from a description (for 24Media league extraction)
const getFirstSentenceWithLeague = (description) => {
  if (!description) return null;
  const sentences = description.split(/(?<=[.·!;])\s+/);
  return sentences[0].endsWith('.') ? sentences[0].slice(0, -1) : sentences[0];
};

// Function to fetch Gazzetta TV schedule
async function fetchGazzettaSchedule() {
  const url = 'https://www.gazzetta.gr/gztfeeds/tvschedule-v2';
  const response = await fetch(url);
  const data = await response.json();
  const matches = [];
  const allTeams = new Set();

  for (const day in data.dates) {
    data.dates[day].events.forEach(match => {
      // Collect all teams
      if (match.participant1?.name) allTeams.add(match.participant1.name);
      if (match.participant2?.name) allTeams.add(match.participant2.name);

      // Add all matches without filtering
      const details = {
        title: `${match.participant1?.name} - ${match.participant2?.name} (${match.sport_name})`,
        participants: [
          match.participant1?.name || "N/A",
          match.participant2?.name || "N/A",
        ],
        date: `${day}/${new Date().getFullYear()}`,
        channel: match.channel1?.name || "N/A",
        time: match.plainTime,
        league: match.league?.name || "N/A",
        sport: match.sport_name,
        source: 'gazzetta'
      };
      details.id = createHash(details);
      matches.push(details);
    });
  }

  return { matches, allTeams: Array.from(allTeams) };
}

// Function to fetch 24Media TV schedule
async function fetch24MediaSchedule() {
  const url = `https://tv.24media.gr/service/events?accept=json&date=${today()}&days=7&pId=3`;
  const response = await fetch(url);
  const data = await response.json();
  const matches = [];
  const allTeams = new Set();

  // Process each event from 24Media
  data.forEach(event => {
    // Split title to get team names (assuming format: "Team1 - Team2 (Sport)")
    const titleParts = event.title.split(' - ');
    const team1 = titleParts[0] || "N/A";
    let team2 = "N/A";
    let sport = "N/A";

    if (titleParts.length > 1) {
      // If title contains "(Sport)", extract team2 and sport separately
      const team2Parts = titleParts[1].split(' (');
      team2 = team2Parts[0];
      if (team2Parts.length > 1) {
        sport = team2Parts[1].replace(')', '');
      }
    }

    // Add teams to the set
    if (team1 !== "N/A") allTeams.add(team1);
    if (team2 !== "N/A") allTeams.add(team2);

    // Create match details object similar to Gazzetta format
    const details = {
      title: event.title,
      participants: [
        team1,
        team2
      ],
      date: event.dateView,
      channel: event.channel?.name || "N/A",
      time: event.timeView,
      league: getFirstSentenceWithLeague(event.description) || "N/A",
      sport: sport,
      source: 'media24'
    };
    details.id = createHash(details);
    matches.push(details);
  });

  return { matches, allTeams: Array.from(allTeams) };
}

// Generic function to fetch data based on source
async function fetchDataBySource(source) {
  console.log(`fetchDataBySource called with source: ${source}`);
  if (source === 'gazzetta') {
    return fetchGazzettaSchedule();
  } else if (source === 'media24') {
    return fetch24MediaSchedule();
  } else {
    throw new Error(`Unknown data source: ${source}`);
  }
}

// Route to get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const source = req.query.source || 'gazzetta';
    console.log(`/api/teams endpoint called with source: ${source}`);
    const currentTime = Date.now();
    const sourceCache = cache[source];// Check if teams cache is valid
    if (sourceCache.teams && sourceCache.lastFetchTime && 
        (currentTime - sourceCache.lastFetchTime < CACHE_DURATION)) {
      console.log(`[${source.toUpperCase()}] Teams: Using cached data (age: ${Math.round((currentTime - sourceCache.lastFetchTime)/1000)}s)`);
      return res.json(sourceCache.teams);
    }

    console.log(`[${source.toUpperCase()}] Teams: Fetching fresh data`);
    const { allTeams } = await fetchDataBySource(source);

    // Update cache
    sourceCache.teams = allTeams;
    sourceCache.lastFetchTime = currentTime;

    res.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Route to get all leagues
app.get('/api/leagues', async (req, res) => {
  try {
    const source = req.query.source || 'gazzetta';
    console.log(`/api/leagues endpoint called with source: ${source}`);
    const currentTime = Date.now();
    const sourceCache = cache[source];// Check if schedule cache is valid
    if (sourceCache.schedule && sourceCache.lastFetchTime && 
        (currentTime - sourceCache.lastFetchTime < CACHE_DURATION)) {
      console.log(`[${source.toUpperCase()}] Leagues: Using cached data (age: ${Math.round((currentTime - sourceCache.lastFetchTime)/1000)}s)`);
      // Extract leagues from cached schedule data
      const leagues = new Set();
      sourceCache.schedule.forEach(match => {
        if (match.league && match.league !== 'N/A') {
          leagues.add(match.league);
        }
      });
      return res.json(Array.from(leagues).sort());
    }

    console.log(`[${source.toUpperCase()}] Leagues: Fetching fresh data`);
    const { matches } = await fetchDataBySource(source);
    
    // Extract leagues from matches
    const leagues = new Set();
    matches.forEach(match => {
      if (match.league && match.league !== 'N/A') {
        leagues.add(match.league);
      }
    });

    // Update cache
    sourceCache.schedule = matches;
    sourceCache.lastFetchTime = currentTime;

    res.json(Array.from(leagues).sort());
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Route to get filtered matches
app.post('/api/schedule', async (req, res) => {
  try {
    const { selectedTeams, selectedLeagues, source = 'gazzetta' } = req.body;
    console.log(`/api/schedule endpoint called with source: ${source}`);

    if ((!selectedTeams || !Array.isArray(selectedTeams)) && 
        (!selectedLeagues || !Array.isArray(selectedLeagues))) {
      return res.status(400).json({ error: 'Invalid or missing parameters' });
    }

    const currentTime = Date.now();
    const sourceCache = cache[source];

    // Check if schedule cache is valid
    if (sourceCache.schedule && sourceCache.lastFetchTime && 
        (currentTime - sourceCache.lastFetchTime < CACHE_DURATION)) {
      console.log(`Returning cached schedule data from ${source}`);
    } else {
      console.log(`Fetching fresh schedule data from ${source}`);
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
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Endpoint to add a match to the calendar
app.post('/api/calendar/add', async (req, res) => {
  try {
    const match = req.body;
    
    if (!match) {
      return res.status(400).json({ error: 'Missing match data' });
    }

    // Call Google Calendar API to add the event
    authorize(async (auth) => {
      try {
        await addEvent(auth, match);
        res.json({ success: true, message: 'Match added to calendar successfully' });
      } catch (error) {
        console.error('Error adding match to calendar:', error);
        res.status(500).json({ error: 'Failed to add match to calendar' });
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start the server
app.listen(port, () => {
  console.log(`Unified Server running on http://localhost:${port}`);
});
