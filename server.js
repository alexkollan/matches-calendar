import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

import { createHash } from './src/utils.js';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cache for storing schedule and teams data
let scheduleCache = null;
let teamsCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Function to fetch TV schedule directly without filtering
async function fetchScheduleDirectly() {
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
      };
      details.id = createHash(details);
      matches.push(details);
    });
  }

  return { matches, allTeams: Array.from(allTeams) };
}

// Route to get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const currentTime = Date.now();

    // Check if teams cache is valid
    if (teamsCache && lastFetchTime && (currentTime - lastFetchTime < CACHE_DURATION)) {
      console.log('Returning cached teams data');
      return res.json(teamsCache);
    }

    console.log('Fetching fresh teams data');
    const { allTeams } = await fetchScheduleDirectly();

    // Update cache
    teamsCache = allTeams;
    lastFetchTime = currentTime;

    res.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Route to get all leagues
app.get('/api/leagues', async (req, res) => {
  try {
    const currentTime = Date.now();

    // Check if cache is valid
    if (scheduleCache && lastFetchTime && (currentTime - lastFetchTime < CACHE_DURATION)) {
      console.log('Using cached data for leagues');
      // Extract leagues from cached schedule data
      const leagues = new Set();
      scheduleCache.forEach(match => {
        if (match.league && match.league !== 'N/A') {
          leagues.add(match.league);
        }
      });
      return res.json(Array.from(leagues).sort());
    }

    console.log('Fetching fresh data for leagues');
    const { matches } = await fetchScheduleDirectly();
    
    // Extract leagues from matches
    const leagues = new Set();
    matches.forEach(match => {
      if (match.league && match.league !== 'N/A') {
        leagues.add(match.league);
      }
    });

    res.json(Array.from(leagues).sort());
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Route to get filtered matches
app.post('/api/schedule', async (req, res) => {
  try {
    const { selectedTeams, selectedLeagues } = req.body;

    if ((!selectedTeams || !Array.isArray(selectedTeams)) && 
        (!selectedLeagues || !Array.isArray(selectedLeagues))) {
      return res.status(400).json({ error: 'Invalid or missing parameters' });
    }

    const currentTime = Date.now();

    // Check if schedule cache is valid
    if (scheduleCache && lastFetchTime && (currentTime - lastFetchTime < CACHE_DURATION)) {
      console.log('Returning cached schedule data');
    } else {
      console.log('Fetching fresh schedule data');
      const { matches } = await fetchScheduleDirectly();

      // Update cache
      scheduleCache = matches;
      lastFetchTime = currentTime;
    }

    // Filter matches based on selected teams and leagues
    let filteredMatches = scheduleCache;
    
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});