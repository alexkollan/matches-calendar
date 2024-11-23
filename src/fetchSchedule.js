const fetch = require('node-fetch');
const { createHash } = require('./utils');
const { addEvent } = require('./calendar');

/**
 * Fetches the TV schedule and adds matches to Google Calendar.
 * @param {google.auth.OAuth2} auth - The authorized OAuth2 client.
 */
async function fetchTVSchedule(auth) {
    const url = 'https://www.gazzetta.gr/gztfeeds/tvschedule-v2';
    const response = await fetch(url);
    const data = await response.json();

    const teams = ["ΟΛΥΜΠΙΑΚΟΣ", "ΠΑΝΑΘΗΝΑΙΚΟΣ", "ΕΛΛΑΔΑ"];
    const matches = [];

    for (const day in data.dates) {
        data.dates[day].events.forEach(match => {
            if (
                (match.sport_name === "Ποδόσφαιρο" || match.sport_name === "Μπάσκετ") &&
                teams.some(team => match.participant1?.name?.includes(team) || match.participant2?.name?.includes(team)) &&
                !match.league?.name?.includes("Γυναικών")
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

    for (const match of matches) {
        await addEvent(auth, match);
    }
}

module.exports = { fetchTVSchedule };
