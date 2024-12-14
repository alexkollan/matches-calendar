// src/calendar.js

const { google } = require('googleapis');
const calendar = google.calendar('v3');

/**
 * Adds an event to Google Calendar.
 * @param {google.auth.OAuth2} auth - The authorized OAuth2 client.
 * @param {Object} match - The match details.
 */
async function addEvent(auth, match) {
    const [day, month, year] = match.date.split('/');
    const [hours, minutes] = match.time.split(':');
    const dateTimeString = new Date(year, month - 1, day, hours, minutes);

    let startDateTime, endDateTime;

    try {
        startDateTime = dateTimeString.toISOString();
        endDateTime = new Date(dateTimeString.getTime() + 2 * 60 * 60 * 1000).toISOString(); // Assuming 2 hours duration
    } catch (error) {
        console.error(`Invalid date or time value: ${match.date} ${match.time}`);
        console.error(error.message);
        return;
    }

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

        console.log('Inserting event:', event);

        const insertRes = await calendar.events.insert({
            auth: auth,
            calendarId: 'primary',
            resource: event,
        });

        console.log(`Event added: ${match.title} (Event ID: ${insertRes.data.id})`);

        // Add a delay between requests
        await delay(1000); // 1 second delay
    } catch (err) {
        console.error(`Error adding event: ${match.title}`);
        console.error(err.errors || err.message);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { addEvent };