import { google } from 'googleapis';
import { createHash } from './utils.js';

/**
 * Adds an event to Google Calendar if it doesn't already exist.
 * @param {google.auth.OAuth2} auth - The authorized OAuth2 client.
 * @param {Object} match - Match details to add as an event.
 */
export async function addEvent(auth, match) {
    console.log(match);
    const calendar = google.calendar({ version: 'v3', auth });

    let year, month, day;

    if (match.date.includes('/')) {
        // Gazzetta format: DD/MM/YYYY
        [day, month, year] = match.date.split('/');
    } else {
        // 24Media format: YYYY-MM-DD
        [year, month, day] = match.date.split('-');
    }
    const startDateTime = `${year}-${month}-${day}T${match.time}:00`;

    const [hours, minutes] = match.time.split(':').map(Number);
    const endHours = hours + Math.floor((minutes + 120) / 60);
    const endMinutes = (minutes + 120) % 60;
    const endDateTime = `${year}-${month}-${day}T${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

    try {
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(`${year}-${month}-${day}T00:00:00`).toISOString(),
            timeMax: new Date(`${year}-${month}-${day}T23:59:59`).toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const existingEvent = res.data.items.find(event =>
            event.summary.trim().toLowerCase() === match.title.trim().toLowerCase() &&
            event.description?.includes(`Event ID: ${match.id}`)
        );

        if (existingEvent) {
            console.log(`Event already exists: ${match.title} (Event ID: ${match.id})`);
            return;
        }

        const event = {
            summary: match.title,
            start: { dateTime: startDateTime, timeZone: 'Europe/Athens' },
            end: { dateTime: endDateTime, timeZone: 'Europe/Athens' },
            location: match.channel,
            description: `League: ${match.league},\nEvent ID: ${match.id}`,
            colorId: '2',
        };

        const insertRes = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        console.log(`Event added: ${match.title} (Event ID: ${insertRes.data.id})`);
    } catch (err) {
        console.error(`Error adding event: ${match.title}`);
        console.error(err.errors || err.message);
        console.error(err);
    }
}
