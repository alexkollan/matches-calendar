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

// Cache for storing schedule and teams data
let scheduleCache = null;
let teamsCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Helper function to get today's date in YYYY-MM-DD format
function today() {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];
    return formatted;
}

const getFirstSentenceWithLeague = (description) => {
    if (!description) return null;
    const sentences = description.split(/(?<=[.·!;])\s+/);
    return sentences[0].endsWith('.') ? sentences[0].slice(0, -1) : sentences[0];
};


// Function to fetch 24Media TV schedule directly without filtering
async function fetchScheduleDirectly() {
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
        };
        details.id = createHash(details);
        matches.push(details);
    });

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

        // Update cache
        scheduleCache = matches;
        lastFetchTime = currentTime;

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
    console.log(`24Media Server running on http://localhost:${port}`);
});
