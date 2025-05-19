import { fetchGazzettaSchedule } from './fetchGazzettaSchedule.js';
import { fetch24MediaSchedule } from './fetch24MediaSchedule.js';
import { addEvent } from './calendar.js';

/**
 * Runs the selected integration and adds events to calendar.
 * @param {google.auth.OAuth2} auth - The authorized OAuth2 client
 * @param {"gazzetta" | "24media"} source - The source to pull from
 */
export async function runIntegration(auth, source = 'gazzetta') {
  let matches = [];

  if (source === 'gazzetta') {
    matches = await fetchGazzettaSchedule();
  } else if (source === '24media') {
    matches = await fetch24MediaSchedule();
  } else {
    throw new Error(`Unknown source: ${source}`);
  }

  if (matches.length === 0) {
    console.log('No matches found.');
    return;
  }

  for (const match of matches) {
    console.log(`Adding event to calendar: ${match.title}`);
    await addEvent(auth, match);
  }
}
