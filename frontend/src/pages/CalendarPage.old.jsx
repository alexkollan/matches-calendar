import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

/**
 * Calendar page component
 * Shows calendar view with synced events and integration controls
 */
function CalendarPage() {
  const { 
    auth, 
    events, 
    sync, 
    state, 
    updateCalendarSettings, 
    addNotification 
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'week', 'day'
  const [showSyncedOnly, setShowSyncedOnly] = useState(false);

  // Get events for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.events.filter(event => 
      isSameDay(new Date(event.date), date) &&
      (!showSyncedOnly || event.calendarEventId)
    );
  };

  // Navigate calendar
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handle calendar settings update
  const handleCalendarSettingsChange = (settings) => {
    updateCalendarSettings(settings);
    addNotification({
      type: 'success',
      title: 'Settings Updated',
      message: 'Calendar integration settings have been saved'
    });
  };

  // Sync selected events
  const syncSelectedEvents = async (eventIds) => {
    try {
      await events.syncEventsToCalendar(eventIds);
      addNotification({
        type: 'success',
        title: 'Events Synced',
        message: `${eventIds.length} events synced to calendar`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: error.message
      });
    }
  };

  // Remove events from calendar
  const removeEventsFromCalendar = async (eventIds) => {
    try {
      await events.removeEventsFromCalendar(eventIds);
      addNotification({
        type: 'success',
        title: 'Events Removed',
        message: `${eventIds.length} events removed from calendar`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Remove Failed',
        message: error.message
      });
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-20">
          <div className="card text-center p-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-accent/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Authentication Required</h2>
            <p className="text-text-secondary">
              Please sign in to access calendar integration features
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Calendar Controls Card */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-default bg-gray-800 hover:bg-gray-700 text-text-secondary hover:text-text-primary transition-colors"
              title="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
                
            <h2 className="text-2xl font-semibold text-text-primary">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-default bg-gray-800 hover:bg-gray-700 text-text-secondary hover:text-text-primary transition-colors"
              title="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="btn-secondary text-sm"
            >
              Today
            </button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showSyncedOnly"
                checked={showSyncedOnly}
                onChange={(e) => setShowSyncedOnly(e.target.checked)}
                className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
              />
              <label htmlFor="showSyncedOnly" className="text-sm text-text-secondary">
                Synced only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="card mb-6">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-text-secondary bg-background border-r border-border last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {monthDays.map(day => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  min-h-[100px] p-3 border-r border-b border-border cursor-pointer 
                  hover:bg-gray-800/50 transition-colors last:border-r-0
                  ${isSelected ? 'bg-accent/20 border-accent' : ''}
                  ${isTodayDate ? 'bg-blue-600/10' : ''}
                `}
              >
                <div className={`
                  text-sm font-medium mb-2
                  ${isTodayDate ? 'text-blue-400' : 'text-text-primary'}
                  ${isSelected ? 'text-accent' : ''}
                `}>
                  {format(day, 'd')}
                </div>
                
                {dayEvents.length > 0 && (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`
                          text-xs px-2 py-1 rounded-md truncate border
                          ${event.calendarEventId 
                            ? 'bg-success/20 text-success border-success/30' 
                            : 'bg-orange-600/20 text-orange-400 border-orange-600/30'
                          }
                        `}
                        title={event.teams ? `${event.teams[0]} vs ${event.teams[1]}` : event.title}
                      >
                        {event.teams ? `${event.teams[0]} vs ${event.teams[1]}` : event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-text-secondary font-medium">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="card mb-6 p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Events for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-text-secondary">No events scheduled for this date.</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(selectedDate).map(event => (
                  <div key={event.id} className="p-4 bg-background rounded-default border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-text-primary">
                        {event.teams ? `${event.teams[0]} vs ${event.teams[1]}` : event.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        event.calendarEventId ? 'bg-success/20 text-success' : 'bg-orange-600/20 text-orange-400'
                      }`}>
                        {event.calendarEventId ? 'Synced' : 'Not Synced'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-text-secondary space-y-1">
                      <p>League: {event.league?.name || event.organization || 'Unknown'}</p>
                      <p>Sport: {event.sport?.name || event.sport || 'Unknown'}</p>
                      {event.venue && <p>Venue: {event.venue}</p>}
                      {event.time && <p>Time: {event.time}</p>}
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      {!event.calendarEventId ? (
                        <button
                          onClick={() => syncSelectedEvents([event.id])}
                          disabled={events.loading}
                          className="btn-primary text-sm py-1 px-3"
                        >
                          Add to Calendar
                        </button>
                      ) : (
                        <button
                          onClick={() => removeEventsFromCalendar([event.id])}
                          disabled={events.loading}
                          className="btn-secondary text-sm py-1 px-3"
                        >
                          Remove from Calendar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Calendar Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">{events.events.length}</div>
          <div className="text-sm text-text-secondary">Total Events</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-success mb-2">
            {events.events.filter(e => e.calendarEventId).length}
          </div>
          <div className="text-sm text-text-secondary">Synced Events</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-orange-400 mb-2">
            {events.events.filter(e => !e.calendarEventId).length}
          </div>
          <div className="text-sm text-text-secondary">Not Synced</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">{sync.getSyncSuccessRate()}%</div>
          <div className="text-sm text-text-secondary">Success Rate</div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
