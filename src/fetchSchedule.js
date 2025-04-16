// src/fetchSchedule.js

const fetch = require('node-fetch');
const { createHash } = require('./utils');
const { addEvent } = require('./calendar');
const { teams, leagueExclusions } = require('./config');

/**
 * Fetches the TV schedule and adds matches to Google Calendar.
 * @param {google.auth.OAuth2} auth - The authorized OAuth2 client.
 */
async function fetchTVSchedule(auth) {
    const url = 'https://www.gazzetta.gr/gztfeeds/tvschedule-v2';
    // console.log(`Fetching TV schedule from ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    // console.log(`Fetched data: ${JSON.stringify(data)}`);
    const matches = [];

    for (const day in data.dates) {
        data.dates[day].events.forEach(match => {
            if (
                (match.sport_name === "Ποδόσφαιρο" || match.sport_name === "Μπάσκετ") &&
                teams.some(team => match.participant1?.name?.includes(team) || match.participant2?.name?.includes(team)) &&
                !leagueExclusions.some(exclusion => match.league?.name?.includes(exclusion))
                
            ) {
                // console.log("Match found:", match);
                
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
    if(matches.length === 0) {
        console.log("No matches found for: (", teams.join(", "), ")");
    }

    for (const match of matches) {
        console.log(`Adding event to calendar`);
        await addEvent(auth, match);

    }
}

module.exports = { fetchTVSchedule };


