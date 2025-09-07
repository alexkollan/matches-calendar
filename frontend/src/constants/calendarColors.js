/**
 * Google Calendar Event Colors
 * Based on Google Calendar API color definitions
 */

export const CALENDAR_COLORS = [
  {
    id: '1',
    name: 'Lavender',
    background: '#a4bdfc',
    foreground: '#1d1d1d'
  },
  {
    id: '2',
    name: 'Sage',
    background: '#7ae7bf',
    foreground: '#1d1d1d'
  },
  {
    id: '3',
    name: 'Grape',
    background: '#dbadff',
    foreground: '#1d1d1d'
  },
  {
    id: '4',
    name: 'Flamingo',
    background: '#ff887c',
    foreground: '#1d1d1d'
  },
  {
    id: '5',
    name: 'Banana',
    background: '#fbd75b',
    foreground: '#1d1d1d'
  },
  {
    id: '6',
    name: 'Tangerine',
    background: '#ffb878',
    foreground: '#1d1d1d'
  },
  {
    id: '7',
    name: 'Peacock',
    background: '#46d6db',
    foreground: '#1d1d1d'
  },
  {
    id: '8',
    name: 'Graphite',
    background: '#e1e1e1',
    foreground: '#1d1d1d'
  },
  {
    id: '9',
    name: 'Blueberry',
    background: '#5484ed',
    foreground: '#1d1d1d'
  },
  {
    id: '10',
    name: 'Basil',
    background: '#51b749',
    foreground: '#1d1d1d'
  },
  {
    id: '11',
    name: 'Tomato',
    background: '#dc2127',
    foreground: '#1d1d1d'
  }
];

// Default color (Basil - the greenest one)
export const DEFAULT_CALENDAR_COLOR_ID = '10';

// Helper function to get color by ID
export const getCalendarColorById = (colorId) => {
  return CALENDAR_COLORS.find(color => color.id === colorId) || CALENDAR_COLORS.find(color => color.id === DEFAULT_CALENDAR_COLOR_ID);
};

// Helper function to get color name by ID
export const getCalendarColorName = (colorId) => {
  const color = getCalendarColorById(colorId);
  return color ? color.name : 'Basil';
};
