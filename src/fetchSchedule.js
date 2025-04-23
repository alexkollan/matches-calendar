// src/fetchSchedule.js

import fetch from 'node-fetch';
import { createHash } from './utils.js';
import { addEvent } from './calendar.js';
import { teams, leagueExclusions } from './config.js';

/**
 * Fetches the TV schedule and adds matches to Google Calendar.
 * @param {google.auth.OAuth2} auth - The authorized OAuth2 client.
 * @param {Array} matchesCollector - Optional array to collect matches.
 * @param {boolean} skipCalendarUpdate - Whether to skip updating the calendar.
 * @returns {Array} - The list of matches found.
 */
export async function fetchTVSchedule(auth, matchesCollector = [], skipCalendarUpdate = false) {
    const url = 'https://www.gazzetta.gr/gztfeeds/tvschedule-v2';
    const response = await fetch(url);
    const data = await response.json();
    const matches = [];

    for (const day in data.dates) {
        data.dates[day].events.forEach(match => {
            if (
                (match.sport_name === "Ποδόσφαιρο" || match.sport_name === "Μπάσκετ") &&
                teams.some(team => match.participant1?.name?.includes(team) || match.participant2?.name?.includes(team)) &&
                !leagueExclusions.some(exclusion => match.league?.name?.includes(exclusion))
            ) {
                const details = {
                    title: `${match.participant1?.name} - ${match.participant2?.name} (${match.sport_name})`,
                    date: `${day}/${new Date().getFullYear()}`,
                    channel: match.channel1?.name || "N/A",
                    time: match.plainTime,
                    league: match.league?.name || "N/A",
                };
                details.id = createHash(details);
                matches.push(details);
            }
        });
    }
    
    if (matches.length === 0) {
        console.log("No matches found for: (", teams.join(", "), ")");
    }

    // Add matches to the collector array if provided
    if (matchesCollector) {
        matchesCollector.push(...matches);
    }

    // Update calendar if not skipped
    if (!skipCalendarUpdate) {
        for (const match of matches) {
            console.log(`Adding event to calendar`);
            await addEvent(auth, match);
        }
    }

    return matches;
}


