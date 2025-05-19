import fetch from 'node-fetch';
import { createHash } from './utils.js';
import { teams, leagueExclusions } from './config.js';

export async function fetchGazzettaSchedule() {
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
          time: match.plainTime,
          channel: match.channel1?.name || "N/A",
          league: match.league?.name || "N/A",
        };
        details.id = createHash(details);
        matches.push(details);
      }
    });
  }

  return matches;
}
