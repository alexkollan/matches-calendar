import fetch from 'node-fetch';
import { teams, sports, leagues } from './config.js';

/**
 * Fetches JSON data from the 24Media TV events API and prints it in a readable format
 */
async function fetchTVEvents() {
  try {
    const url = 'https://tv.24media.gr/service/events?accept=json&date=2025-05-19&days=7&pId=3';
    console.log(`Fetching data from ${url}...`);
    console.log("Loaded teams:", teams);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('TV Events Data:');

    const normalize = str =>
      str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const getFirstSentenceWithLeague = (description, leagues) => {
      if (!description) return null;
      const sentences = description.split(/(?<=[.·!;])\s+/);
      return sentences.find(sentence =>
        leagues.some(league => sentence.includes(league))
      ) || null;
    };

    const filter = data.filter(event =>
      teams.some(team =>
        normalize(event.title).includes(normalize(team))
      ) &&
      event.tags.some(tag =>
        ['basket', 'football'].includes(tag.name.toLowerCase())
      ) &&
      leagues.some(league =>
        event.description && event.description.includes(league)
      )
    );

    const matches = filter.map(event => ({
      title: event.title,
      description: getFirstSentenceWithLeague(event.description, leagues),
      date: event.dateView,
      time: event.timeView,
      channel: event.channel.name,
      tags: event.tags.map(tag => tag.name).join(', ')
    }));

    console.log('Filtered Events:', matches);
  } catch (error) {
    console.error('Error fetching TV events:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    throw error;
  }
}

// Execute the function
fetchTVEvents()
  .then(() => console.log('Data fetched successfully'))
  .catch(err => console.error('Failed to fetch data'));

  