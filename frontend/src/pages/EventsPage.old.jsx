import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { format } from 'date-fns';
import TruncatedText from '../components/TruncatedText.jsx';
import { useNotifications, NotificationContainer } from '../hooks/useNotifications.jsx';

/**
 * Events page component
 * Main page for viewing and filtering sports events
 */
function EventsPage() {
  const { 
    state, 
    events, 
    auth, 
    filteredEvents,
    setSelectedTeams,
    setSelectedLeagues,
    setSelectedSports,
    updatePreferences
  } = useApp();

  const { notifications, addNotification, removeNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Filter events by search term
  const searchFilteredEvents = (filteredEvents || []).filter(event => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Handle both old and new data structures
    const homeTeamName = event.homeTeam?.name || (event.teams && event.teams[0]) || '';
    const awayTeamName = event.awayTeam?.name || (event.teams && event.teams[1]) || '';
    const leagueName = event.league?.name || event.organization || '';
    const sportName = event.sport?.name || event.sport || '';
    
    return (
      homeTeamName.toLowerCase().includes(searchLower) ||
      awayTeamName.toLowerCase().includes(searchLower) ||
      leagueName.toLowerCase().includes(searchLower) ||
      sportName.toLowerCase().includes(searchLower) ||
      event.title?.toLowerCase().includes(searchLower) ||
      (event.teams && event.teams.some(team => team.toLowerCase().includes(searchLower)))
    );
  });

  // Sort events
  const sortedEvents = [...searchFilteredEvents].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'date':
        // Use the same logic as EventCard for consistent date sorting
        const getEventDateTime = (event) => {
          if (event.metadata?.originalEvent?.scheduleDate) {
            return event.metadata.originalEvent.scheduleDate;
          }
          return event.startTime || event.date;
        };
        compareValue = new Date(getEventDateTime(a)) - new Date(getEventDateTime(b));
        break;
      case 'league':
        const aLeague = a.league?.name || a.organization || '';
        const bLeague = b.league?.name || b.organization || '';
        compareValue = aLeague.localeCompare(bLeague);
        break;
      case 'sport':
        compareValue = (a.sport?.name || '').localeCompare(b.sport?.name || '');
        break;
      case 'teams':
        const aTeams = `${a.homeTeam?.name || ''} vs ${a.awayTeam?.name || ''}`;
        const bTeams = `${b.homeTeam?.name || ''} vs ${b.awayTeam?.name || ''}`;
        compareValue = aTeams.localeCompare(bTeams);
        break;
      default:
        compareValue = 0;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  // Load events on mount
  useEffect(() => {
    if (auth.isAuthenticated) {
      events.fetchEvents();
      events.fetchMetadata();
    }
  }, [auth.isAuthenticated]);

  // Handle team selection
  const handleTeamToggle = (teamId) => {
    const currentTeams = state.preferences.selectedTeams;
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter(id => id !== teamId)
      : [...currentTeams, teamId];
    
    setSelectedTeams(newTeams);
  };

  // Handle league selection
  const handleLeagueToggle = (leagueId) => {
    const currentLeagues = state.preferences.selectedLeagues;
    const newLeagues = currentLeagues.includes(leagueId)
      ? currentLeagues.filter(id => id !== leagueId)
      : [...currentLeagues, leagueId];
    
    setSelectedLeagues(newLeagues);
  };

  // Handle sport selection
  const handleSportToggle = (sportId) => {
    const currentSports = state.preferences.selectedSports;
    const newSports = currentSports.includes(sportId)
      ? currentSports.filter(id => id !== sportId)
      : [...currentSports, sportId];
    
    setSelectedSports(newSports);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTeams([]);
    setSelectedLeagues([]);
    setSelectedSports([]);
    setSearchTerm('');
  };

  // Add event to calendar
  const addToCalendar = async (event) => {
    try {
      const result = await events.addToCalendar(event);
      
      // Show appropriate notification based on result
      if (result.type === 'info') {
        addNotification({
          type: 'info',
          title: 'Event Already Exists',
          message: result.message
        });
      } else {
        addNotification({
          type: 'success',
          title: 'Added to Calendar',
          message: result.message
        });
      }
    } catch (err) {
      console.error('Add to calendar failed:', err);
      addNotification({
        type: 'error',
        title: 'Calendar Error',
        message: 'Failed to add event to calendar'
      });
    }
  };

  // Sync selected events to calendar
  const syncToCalendar = async (eventIds = null) => {
    const eventsToSync = eventIds || sortedEvents.map(e => e.id);
    
    try {
      if (Array.isArray(eventsToSync) && eventsToSync.length > 1) {
        // Use batch sync for multiple events
        const eventsData = sortedEvents.filter(e => eventsToSync.includes(e.id));
        await events.addBatchToCalendar(eventsData);
      } else {
        // Single event sync
        const eventId = Array.isArray(eventsToSync) ? eventsToSync[0] : eventsToSync;
        const eventData = sortedEvents.find(e => e.id === eventId);
        if (eventData) {
          await events.addToCalendar(eventData);
        }
      }
      // Success notification will be handled by the hook
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-20">
          <div className="card text-center p-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-accent/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Authentication Required</h2>
            <p className="text-text-secondary">
              Please sign in to view sports events
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Control Panel */}
        <div className="card mb-6 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-2">Search Events</label>
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search events, teams, leagues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-default text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Sort & View Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Sort & View</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-3 bg-background border border-border rounded-default text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  >
                    <option value="date">Date</option>
                    <option value="league">League</option>
                    <option value="sport">Sport</option>
                    <option value="teams">Teams</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-3 bg-gray-800 border border-border rounded-default text-text-secondary hover:text-text-primary hover:bg-gray-700 transition-colors"
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <svg className={`w-4 h-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    className="px-3 py-3 bg-gray-800 border border-border rounded-default text-text-secondary hover:text-text-primary hover:bg-gray-700 transition-colors"
                    title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
                  >
                    {viewMode === 'list' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="btn-secondary flex-1 text-sm py-2"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => syncToCalendar()}
                  disabled={events.loading}
                  className="btn-primary flex-1 text-sm py-2 disabled:opacity-50"
                >
                  {events.loading ? (
                    <div className="loading-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto"></div>
                  ) : (
                    'Sync All'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sports Filter */}
              {events.metadata?.sports?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Sports</label>
                  <div className="flex flex-wrap gap-2">
                    {events.metadata.sports.map((sport, index) => (
                      <button
                        key={sport.id || sport.name || `sport-${index}`}
                        onClick={() => handleSportToggle(sport.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          state.preferences.selectedSports.includes(sport.id) 
                            ? 'bg-accent text-white' 
                            : 'bg-gray-800 text-text-secondary hover:text-text-primary hover:bg-gray-700'
                        }`}
                      >
                        {sport.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Leagues Filter */}
              {events.metadata?.leagues?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Leagues</label>
                  <div className="flex flex-wrap gap-2">
                    {events.metadata.leagues.slice(0, 5).map((league, index) => (
                      <button
                        key={league.id || league.name || `league-${index}`}
                        onClick={() => handleLeagueToggle(league.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          state.preferences.selectedLeagues.includes(league.id) 
                            ? 'bg-accent text-white' 
                            : 'bg-gray-800 text-text-secondary hover:text-text-primary hover:bg-gray-700'
                        }`}
                      >
                        {league.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Events Display */}
        <div>
          {events.loading ? (
            <div className="card p-12 text-center">
              <div className="loading-spinner w-12 h-12 border-4 border-surface border-t-accent rounded-full mx-auto mb-4"></div>
              <div className="text-lg font-medium text-text-primary">Loading events...</div>
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-xl font-medium text-text-primary mb-2">No Events Found</div>
              <div className="text-text-secondary mb-4">
                {searchTerm 
                  ? `No events match "${searchTerm}"`
                  : 'No events available with current filters'
                }
              </div>
              {(searchTerm || state.preferences.selectedTeams.length > 0 || 
                state.preferences.selectedLeagues.length > 0 || 
                state.preferences.selectedSports.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-text-primary">Upcoming Matches</h2>
                <span className="text-text-secondary">
                  {sortedEvents.length} events
                </span>
              </div>
              
              <div className={`
                ${viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'space-y-4'
                }
              `}>
                {sortedEvents.map((event, index) => (
                  <EventCard 
                    key={`event-${event.id || index}-${event.externalId || event.title || Date.now()}-${index}`} 
                    event={event} 
                    onSync={() => syncToCalendar([event.id])}
                    loading={events.loading}
                    viewMode={viewMode}
                    onNotification={addNotification}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </>
  );
}

/**
 * Individual event card component
 */
function EventCard({ event, onSync, loading, viewMode = 'list', onNotification }) {
  const formatEventDate = (dateString) => {
    // Handle both date formats (legacy and new)
    if (!dateString) return { date: 'TBD', time: 'TBD', weekday: 'TBD' };
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { date: 'Invalid Date', time: 'TBD', weekday: 'TBD' };
    }
    
    return {
      date: format(date, 'MMM d'),
      time: format(date, 'HH:mm'),
      weekday: format(date, 'EEE')
    };
  };

  // Use the metadata originalEvent scheduleDate if available for more accurate timing
  const getEventDateTime = (event) => {
    // Priority order: originalEvent.scheduleDate > startTime > date
    if (event.metadata?.originalEvent?.scheduleDate) {
      return event.metadata.originalEvent.scheduleDate;
    }
    return event.startTime || event.date;
  };

  const eventDateTime = getEventDateTime(event);
  const eventDate = formatEventDate(eventDateTime);

  return (
    <div className="card p-6 hover:shadow-xl transition-all duration-200 hover:border-accent/50">
      <div className="flex items-start justify-between mb-4">
        {/* Date/Time */}
        <div className="text-center">
          <div className="text-2xl font-bold text-text-primary">{eventDate.date}</div>
          <div className="text-sm text-text-secondary">
            <div>{eventDate.weekday}</div>
            <div>{eventDate.time}</div>
          </div>
        </div>
        
        {/* Source indicator */}
        <div className="flex items-center gap-2">
          <span 
            className="text-xs px-2 py-1 rounded-full bg-gray-800 text-text-secondary"
            title={`Source: ${event.dataSource || event.source || 'Unknown'}`}
          >
            {(event.dataSource === '24media' || event.source === '24media') ? 'Media24' : 'Gazzetta'}
          </span>
          <div className={`w-2 h-2 rounded-full ${event.calendarEventId ? 'bg-success' : 'bg-gray-600'}`} 
               title={event.calendarEventId ? 'Synced to calendar' : 'Not synced'}>
          </div>
        </div>
      </div>

      {/* Event Match */}
      <div className="mb-4">
        {/* Handle both new structure (teams array) and legacy structure (homeTeam/awayTeam) */}
        {event.teams && event.teams.length >= 2 ? (
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">
              {event.teams[0]} vs {event.teams[1]}
            </div>
          </div>
        ) : event.homeTeam && event.awayTeam ? (
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">
              {event.homeTeam.name || 'TBD'} vs {event.awayTeam.name || 'TBD'}
            </div>
          </div>
        ) : event.teams && event.teams.length === 1 ? (
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">{event.teams[0]}</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">{event.title || 'Event'}</div>
          </div>
        )}
      </div>

      {/* Event Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
          {event.league?.name || event.organization || 'Unknown League'}
        </span>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
          {event.sport?.name || event.sport || 'Unknown Sport'}
        </span>
        {event.venue && (
          <span className="px-3 py-1 bg-gray-800 text-text-secondary rounded-full text-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.venue}
          </span>
        )}
      </div>

      {/* Event Description with Truncation */}
      {event.description && (
        <div className="mb-4">
          <TruncatedText 
            text={event.description}
            maxChars={120}
            maxLines={2}
            title="Event Details"
            className="text-text-secondary text-sm"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {/* Sync Status */}
        <div className="flex items-center gap-2">
          {event.calendarEventId ? (
            <span className="text-success text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Synced
            </span>
          ) : (
            <span className="text-text-secondary text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending
            </span>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={loading}
          className={`px-4 py-2 rounded-default text-sm font-medium transition-colors flex items-center gap-2 ${
            event.calendarEventId 
              ? 'bg-gray-800 text-text-secondary hover:text-text-primary hover:bg-gray-700' 
              : 'btn-primary'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={event.calendarEventId ? 'Update in calendar' : 'Add to calendar'}
        >
          {loading ? (
            <div className="loading-spinner w-3 h-3 border-2 border-current border-t-transparent rounded-full"></div>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={event.calendarEventId ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"} />
              </svg>
              {event.calendarEventId ? 'Update' : 'Add to Calendar'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default EventsPage;
