import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Badge,
  CircularProgress,
  Alert,
  Tooltip,
  Fab
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarMonth,
  Sync,
  Add,
  ViewWeek,
  ViewDay,
  FilterList,
  Schedule,
  Event
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext.jsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, startOfWeek, addDays } from 'date-fns';

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
  const [eventDialog, setEventDialog] = useState({ open: false, events: [], date: null });

  // Get events for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.events.filter(event => 
      isSameDay(new Date(event.date || event.startTime), date) &&
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

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length > 0) {
      setEventDialog({
        open: true,
        events: dayEvents,
        date: date
      });
    }
  };

  // Load events on mount
  useEffect(() => {
    if (auth.isAuthenticated) {
      events.fetchEvents();
    }
  }, [auth.isAuthenticated]);

  // Calendar Day Component
  const CalendarDay = ({ date }) => {
    const dayEvents = getEventsForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isCurrentDay = isToday(date);

    return (
      <Card
        sx={{
          minHeight: 100,
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          backgroundColor: isCurrentDay ? 'primary.light' : isCurrentMonth ? 'background.paper' : 'action.hover',
          opacity: isCurrentMonth ? 1 : 0.5,
          '&:hover': {
            backgroundColor: isCurrentDay ? 'primary.light' : 'action.hover',
          }
        }}
        onClick={() => handleDateClick(date)}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Stack spacing={1}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: isCurrentDay ? 'bold' : 'normal',
                color: isCurrentDay ? 'primary.contrastText' : 'text.primary'
              }}
            >
              {format(date, 'd')}
            </Typography>
            
            {dayEvents.length > 0 && (
              <Stack spacing={0.5}>
                {dayEvents.slice(0, 2).map((event, index) => (
                  <Chip
                    key={index}
                    label={event.homeTeam?.name && event.awayTeam?.name 
                      ? `${event.homeTeam.name} vs ${event.awayTeam.name}`
                      : event.title || 'Event'
                    }
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.7rem',
                      height: 20,
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                ))}
                
                {dayEvents.length > 2 && (
                  <Typography variant="caption" color="text.secondary">
                    +{dayEvents.length - 2} more
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  // Week Header Component
  const WeekHeader = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {weekDays.map((day) => (
          <Grid item xs key={day}>
            <Typography
              variant="body2"
              align="center"
              sx={{ fontWeight: 'bold', color: 'text.secondary', py: 1 }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Get calendar weeks
  const getCalendarWeeks = () => {
    const weeks = [];
    const startWeek = startOfWeek(monthStart);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(startWeek, week * 7 + day);
        weekDays.push(date);
      }
      weeks.push(weekDays);
      
      // Stop if we've covered the entire month
      if (weekDays[weekDays.length - 1] > monthEnd) {
        break;
      }
    }
    
    return weeks;
  };

  const weeks = getCalendarWeeks();

  if (!auth.isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CalendarMonth sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography color="text.secondary">
            Please sign in to view calendar integration
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          {/* Calendar Navigation */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigateMonth(-1)}>
              <ChevronLeft />
            </IconButton>
            
            <Typography variant="h5" component="h1" sx={{ minWidth: 200, textAlign: 'center' }}>
              {format(currentDate, 'MMMM yyyy')}
            </Typography>
            
            <IconButton onClick={() => navigateMonth(1)}>
              <ChevronRight />
            </IconButton>
            
            <Button
              variant="outlined"
              startIcon={<Today />}
              onClick={goToToday}
              size="small"
            >
              Today
            </Button>
          </Stack>

          {/* View Controls */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showSyncedOnly}
                  onChange={(e) => setShowSyncedOnly(e.target.checked)}
                />
              }
              label="Synced only"
            />
            
            <Button
              variant="contained"
              startIcon={sync.loading ? <CircularProgress size={16} /> : <Sync />}
              onClick={sync.executeManualSync}
              disabled={sync.loading || !sync.canSync}
              size="small"
            >
              {sync.loading ? 'Syncing...' : 'Sync Events'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Calendar Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Event color="primary" />
                <Box>
                  <Typography variant="h6">
                    {events.events?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Events
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Sync color="success" />
                <Box>
                  <Typography variant="h6">
                    {events.events?.filter(e => e.calendarEventId)?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Synced Events
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CalendarMonth color="info" />
                <Box>
                  <Typography variant="h6">
                    {monthDays.filter(date => getEventsForDate(date).length > 0).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Days with Events
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Schedule color="warning" />
                <Box>
                  <Typography variant="h6">
                    {state.lastSync ? format(new Date(state.lastSync), 'MMM dd') : 'Never'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last Sync
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Calendar Grid */}
      <Paper sx={{ p: 2 }}>
        <WeekHeader />
        
        {events.loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1}>
            {weeks.map((week, weekIndex) => (
              <Grid container spacing={1} key={weekIndex}>
                {week.map((date, dayIndex) => (
                  <Grid item xs key={dayIndex}>
                    <CalendarDay date={date} />
                  </Grid>
                ))}
              </Grid>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Events Dialog */}
      <Dialog
        open={eventDialog.open}
        onClose={() => setEventDialog({ open: false, events: [], date: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {eventDialog.date && format(eventDialog.date, 'EEEE, MMMM dd, yyyy')}
        </DialogTitle>
        <DialogContent>
          <List>
            {eventDialog.events.map((event, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    event.homeTeam?.name && event.awayTeam?.name 
                      ? `${event.homeTeam.name} vs ${event.awayTeam.name}`
                      : event.title || 'Event'
                  }
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography variant="caption">
                        {event.league?.name || event.organization} • {event.sport?.name || event.sport}
                      </Typography>
                      {event.startTime && (
                        <Typography variant="caption">
                          {format(new Date(event.startTime), 'h:mm a')}
                        </Typography>
                      )}
                      {event.calendarEventId && (
                        <Chip
                          label="Synced"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialog({ open: false, events: [], date: null })}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await events.addBatchToCalendar(eventDialog.events.filter(e => !e.calendarEventId));
                setEventDialog({ open: false, events: [], date: null });
              } catch (error) {
                console.error('Failed to sync events:', error);
              }
            }}
            disabled={events.loading || eventDialog.events.every(e => e.calendarEventId)}
          >
            Sync All Events
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="sync events"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={sync.executeManualSync}
        disabled={sync.loading}
      >
        {sync.loading ? <CircularProgress size={24} /> : <Sync />}
      </Fab>
    </Container>
  );
}

export default CalendarPage;
