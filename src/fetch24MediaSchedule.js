import fetch from 'node-fetch';
import { createHash } from './utils.js';
import { teams, sports, leagues } from './config.js';

export async function fetch24MediaSchedule() {
  const url = 'https://tv.24media.gr/service/events?accept=json&date=2025-05-19&days=7&pId=3';
  const response = await fetch(url);
  const data = await response.json();

  const normalize = str =>
    str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const getFirstSentenceWithLeague = (description, leagues) => {
    if (!description) return null;
    const sentences = description.split(/(?<=[.·!;])\s+/);
    return sentences[0].endsWith('.') ? sentences[0].slice(0, -1) : sentences[0];
  };

  const filtered = data.filter(event =>
    teams.some(team =>
      normalize(event.title).includes(normalize(team))
    ) &&
    event.tags.some(tag =>
      ['basket', 'football'].includes(tag.name.toLowerCase())
    ) &&
    leagues.some(league =>
      event.description && (event.description.includes(league) || event.title.includes(league))
    )
  );
  

  return filtered.map(event => ({
    title: event.title,
    date: event.dateView,
    time: event.timeView,
    channel: event.channel.name,
    league: getFirstSentenceWithLeague(event.description, leagues),
    id: createHash(event)
  }));
}
