import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Typography,
  Grid,
  Chip,
  InputAdornment,
  Stack,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Fab,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
  Badge
} from '@mui/material';
import {
  Search,
  Sort,
  ViewList,
  ViewModule,
  FilterList,
  Clear,
  Sync,
  Add,
  CalendarMonth,
  Sports,
  Schedule,
  LocationOn,
  Group,
  Tv,
  FilterAlt
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext.jsx';
import { format } from 'date-fns';
import TruncatedText from '../components/TruncatedText.jsx';
import { useNotifications, NotificationContainer } from '../hooks/useNotifications.jsx';
import AdvancedFilters from '../components/AdvancedFilters.jsx';
import FilterService from '../services/filterService.js';
import ColorSelector from '../components/ColorSelector.jsx';
import { DatabaseService } from '../services/db.js';
import { DEFAULT_CALENDAR_COLOR_ID } from '../constants/calendarColors.js';
import * as styles from '../styles/eventsPageStyles.js';

/**
 * Events page component
 * Main page for viewing and filtering sports events
 */
const EventsPage = memo(function EventsPage() {
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
  const [activeTab, setActiveTab] = useState(0);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [eventColors, setEventColors] = useState({}); // Store colors for each event
  const colorUpdateTimeouts = useRef({}); // Store timeout IDs for debouncing

  // Filter events by search term - memoized to prevent unnecessary re-renders
  const searchFilteredEvents = useMemo(() => {
    return (filteredEvents || []).filter(event => {
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
  }, [filteredEvents, searchTerm]);

  // Sort events - memoized to prevent unnecessary re-renders
  const sortedEvents = useMemo(() => {
    return [...searchFilteredEvents].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'date':
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
  }, [searchFilteredEvents, sortBy, sortOrder]);

  // Load events on mount
  useEffect(() => {
    if (auth.isAuthenticated) {
      events.fetchEvents();
      events.fetchMetadata();
    }
  }, [auth.isAuthenticated]);

  // Handle team selection - memoized
  const handleTeamToggle = useCallback((teamId) => {
    const currentTeams = state.preferences.selectedTeams;
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter(id => id !== teamId)
      : [...currentTeams, teamId];
    
    setSelectedTeams(newTeams);
  }, [state.preferences.selectedTeams, setSelectedTeams]);

  // Handle league selection - memoized
  const handleLeagueToggle = useCallback((leagueId) => {
    const currentLeagues = state.preferences.selectedLeagues;
    const newLeagues = currentLeagues.includes(leagueId)
      ? currentLeagues.filter(id => id !== leagueId)
      : [...currentLeagues, leagueId];
    
    setSelectedLeagues(newLeagues);
  }, [state.preferences.selectedLeagues, setSelectedLeagues]);

  // Handle sport selection - memoized
  const handleSportToggle = useCallback((sportId) => {
    const currentSports = state.preferences.selectedSports;
    const newSports = currentSports.includes(sportId)
      ? currentSports.filter(id => id !== sportId)
      : [...currentSports, sportId];
    
    setSelectedSports(newSports);
  }, [state.preferences.selectedSports, setSelectedSports]);

  // Advanced filters handlers - memoized
  const handleApplyAdvancedFilters = useCallback(async (filters) => {
    try {
      await updatePreferences({
        advancedFilters: {
          ...state.preferences.advancedFilters,
          currentFilters: filters
        }
      });
      
      addNotification({
        type: 'success',
        message: `Applied ${filters.length} advanced filters`,
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to apply advanced filters:', error);
      addNotification({
        type: 'error',
        message: 'Failed to apply advanced filters',
        duration: 5000
      });
    }
  }, [updatePreferences, state.preferences.advancedFilters, addNotification]);

  const clearAdvancedFilters = useCallback(async () => {
    try {
      await updatePreferences({
        advancedFilters: {
          ...state.preferences.advancedFilters,
          currentFilters: []
        }
      });
      
      addNotification({
        type: 'info',
        message: 'Advanced filters cleared',
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to clear advanced filters:', error);
    }
  }, [updatePreferences, state.preferences.advancedFilters, addNotification]);

  // Get active advanced filters count
  const activeAdvancedFiltersCount = state.preferences.advancedFilters?.currentFilters?.filter(f => f.enabled)?.length || 0;

  // Clear all filters - memoized
  const clearFilters = useCallback(() => {
    setSelectedTeams([]);
    setSelectedLeagues([]);
    setSelectedSports([]);
    setSearchTerm('');
    clearAdvancedFilters();
  }, [setSelectedTeams, setSelectedLeagues, setSelectedSports, clearAdvancedFilters]);

  // Add event to calendar
  const addToCalendar = async (event) => {
    try {
      // Debug: Log the event object in EventsPage
      console.log('EventsPage.addToCalendar received event:', {
        title: event.title,
        tvChannel: event.tvChannel,
        venue: event.venue,
        hasChannel: !!event.tvChannel,
        eventKeys: Object.keys(event)
      });
      
      const result = await events.addToCalendar(event);
      
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

  // Load event colors from database - only when event IDs actually change
  useEffect(() => {
    const loadEventColors = async () => {
      if (sortedEvents.length > 0) {
        try {
          const eventIds = sortedEvents.map(event => event.id);
          const colors = await DatabaseService.getEventColors(eventIds);
          setEventColors(colors);
        } catch (error) {
          console.error('Failed to load event colors:', error);
        }
      }
    };

    loadEventColors();
  }, [sortedEvents.length, JSON.stringify(sortedEvents.map(e => e.id))]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(colorUpdateTimeouts.current).forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  // Handle event color change with debouncing to prevent excessive database calls
  const handleEventColorChange = useCallback(async (eventId, colorId) => {
    try {
      // Update UI immediately for better UX
      setEventColors(prev => ({
        ...prev,
        [eventId]: colorId
      }));
      
      // Clear existing timeout for this event
      if (colorUpdateTimeouts.current[eventId]) {
        clearTimeout(colorUpdateTimeouts.current[eventId]);
      }
      
      // Debounce database update (500ms delay)
      colorUpdateTimeouts.current[eventId] = setTimeout(async () => {
        try {
          await DatabaseService.setEventColor(eventId, colorId);
          delete colorUpdateTimeouts.current[eventId];
        } catch (dbError) {
          console.error('Failed to save event color to database:', dbError);
          // Revert UI change on database error
          setEventColors(prev => {
            const newColors = { ...prev };
            if (newColors[eventId] === colorId) {
              delete newColors[eventId];
            }
            return newColors;
          });
          addNotification({
            type: 'error',
            title: 'Color Update Error',
            message: 'Failed to save event color'
          });
        }
      }, 500);
    } catch (error) {
      console.error('Failed to update event color:', error);
      // Revert UI change on error
      setEventColors(prev => {
        const newColors = { ...prev };
        if (newColors[eventId] === colorId) {
          delete newColors[eventId];
        }
        return newColors;
      });
      addNotification({
        type: 'error',
        title: 'Color Update Error',
        message: 'Failed to update event color'
      });
    }
  }, [addNotification]);

  // Get color for an event (with fallback to default) - memoized for performance
  const getEventColor = useCallback((eventId) => {
    return eventColors[eventId] || DEFAULT_CALENDAR_COLOR_ID;
  }, [eventColors]);

  // Sync selected events to calendar - memoized
  const syncToCalendar = useCallback(async (eventIds = null) => {
    const eventsToSync = eventIds || sortedEvents.map(e => e.id);
    
    try {
      if (Array.isArray(eventsToSync) && eventsToSync.length > 1) {
        const eventsData = sortedEvents.filter(e => eventsToSync.includes(e.id)).map(event => ({
          ...event,
          colorId: getEventColor(event.id) // Add color information
        }));
        await events.addBatchToCalendar(eventsData);
      } else {
        const eventId = Array.isArray(eventsToSync) ? eventsToSync[0] : eventsToSync;
        const eventData = sortedEvents.find(e => e.id === eventId);
        if (eventData) {
          const eventWithColor = {
            ...eventData,
            colorId: getEventColor(eventData.id) // Add color information
          };
          await events.addToCalendar(eventWithColor);
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }, [sortedEvents, getEventColor, events]);

  // Memoized sync all handler
  const handleSyncAll = useCallback(() => {
    syncToCalendar();
  }, [syncToCalendar]);

  // Memoized tab change handler
  const handleTabChange = useCallback((e, newValue) => {
    setActiveTab(newValue);
  }, []);

  // Event Card Component
  const EventCard = ({ event }) => {
    const getEventDateTime = (event) => {
      if (event.metadata?.originalEvent?.scheduleDate) {
        return event.metadata.originalEvent.scheduleDate;
      }
      return event.startTime || event.date;
    };

    const eventDate = getEventDateTime(event);
    const homeTeam = event.homeTeam?.name || (event.teams && event.teams[0]) || '';
    const awayTeam = event.awayTeam?.name || (event.teams && event.teams[1]) || '';
    const league = event.league?.name || event.organization || '';
    const sport = event.sport?.name || event.sport || '';

    return (
      <Card sx={styles.cardStyles}>
        <CardContent sx={styles.cardContentStyles}>
          <Stack spacing={2}>
            {/* Sport & League */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Sports fontSize="small" color="primary" />
              <Typography variant="caption" color="text.secondary">
                {sport} • {league}
              </Typography>
            </Stack>

            {/* Teams */}
            <Typography variant="h6" component="h3">
              {homeTeam} vs {awayTeam}
            </Typography>

            {/* Date & Time */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Schedule fontSize="small" color="text.secondary" />
              <Typography variant="body2" color="text.secondary">
                {eventDate ? format(new Date(eventDate), 'MMM dd, yyyy • h:mm a') : 'TBD'}
              </Typography>
            </Stack>

            {/* Location if available */}
            {event.location && (
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOn fontSize="small" color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {event.location}
                </Typography>
              </Stack>
            )}

            {/* TV Channel if available */}
            {event.tvChannel && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Tv fontSize="small" color="primary" />
                <Typography variant="body2" color="primary" fontWeight="medium">
                  {event.tvChannel}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>

        <CardActions sx={styles.cardActionsStyles}>
          <Box sx={styles.colorBoxStyles}>
            <Typography variant="caption" color="text.secondary">
              Color:
            </Typography>
            <ColorSelector
              value={getEventColor(event.id)}
              onChange={(colorId) => handleEventColorChange(event.id, colorId)}
              size="small"
              showLabel={false}
            />
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Add />}
            onClick={() => addToCalendar(event)}
            disabled={events.loading}
          >
            Add to Calendar
          </Button>
        </CardActions>
      </Card>
    );
  };

  // Event List Item Component
  const EventListItem = ({ event }) => {
    const getEventDateTime = (event) => {
      if (event.metadata?.originalEvent?.scheduleDate) {
        return event.metadata.originalEvent.scheduleDate;
      }
      return event.startTime || event.date;
    };

    const eventDate = getEventDateTime(event);
    const homeTeam = event.homeTeam?.name || (event.teams && event.teams[0]) || '';
    const awayTeam = event.awayTeam?.name || (event.teams && event.teams[1]) || '';
    const league = event.league?.name || event.organization || '';
    const sport = event.sport?.name || event.sport || '';

    return (
      <ListItem
        divider
        secondaryAction={
          <Box sx={styles.secondaryActionBoxStyles}>
            <ColorSelector
              value={getEventColor(event.id)}
              onChange={(colorId) => handleEventColorChange(event.id, colorId)}
              size="small"
              showLabel={false}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => addToCalendar(event)}
              disabled={events.loading}
            >
              Add
            </Button>
          </Box>
        }
      >
        <ListItemIcon>
          <Sports color="primary" />
        </ListItemIcon>
        <ListItemText
          primary={`${homeTeam} vs ${awayTeam}`}
          secondary={
            <Box component="span" display="block">
              <Typography variant="caption" component="span" display="block">
                {sport} • {league}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="span" display="block">
                {eventDate ? format(new Date(eventDate), 'MMM dd, yyyy • h:mm a') : 'TBD'}
              </Typography>
              {event.tvChannel && (
                <Typography variant="caption" color="primary" component="span" display="flex" alignItems="center" gap={0.5}>
                  <Tv fontSize="inherit" />
                  {event.tvChannel}
                </Typography>
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  if (!auth.isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <CalendarMonth sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5 }} />
          </Box>
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography color="text.secondary">
            Please sign in to view sports events
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Search */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search Events"
              placeholder="Search events, teams, leagues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Sort & View Controls */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort by"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="league">League</MenuItem>
                    <MenuItem value="sport">Sport</MenuItem>
                    <MenuItem value="teams">Teams</MenuItem>
                  </Select>
                </FormControl>

                <Tooltip title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}>
                  <IconButton
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    size="small"
                  >
                    <Sort sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}>
                  <IconButton
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    size="small"
                  >
                    {viewMode === 'list' ? <ViewModule /> : <ViewList />}
                  </IconButton>
                </Tooltip>
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={clearFilters}
                  sx={{ flex: 1 }}
                >
                  Clear
                </Button>
                <Badge badgeContent={activeAdvancedFiltersCount} color="primary">
                  <Button
                    variant={activeAdvancedFiltersCount > 0 ? "contained" : "outlined"}
                    size="small"
                    startIcon={<FilterAlt />}
                    onClick={() => setAdvancedFiltersOpen(true)}
                    sx={{ flex: 1 }}
                  >
                    Advanced
                  </Button>
                </Badge>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={events.loading ? <CircularProgress size={16} /> : <Sync />}
                  onClick={handleSyncAll}
                  disabled={events.loading}
                  sx={{ flex: 1 }}
                >
                  Sync All
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        {/* Quick Filters */}
        <Divider sx={{ my: 3 }} />
        
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ mb: 2 }}
        >
          <Tab label="Sports" />
          <Tab label="Leagues" />
          <Tab label="Teams" />
        </Tabs>

        {/* Sports Filter */}
        {activeTab === 0 && events.metadata?.sports?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {events.metadata.sports.map((sport, index) => (
              <Chip
                key={sport.id || index}
                label={sport.name || sport}
                clickable
                color={state.preferences.selectedSports.includes(sport.id || sport) ? 'primary' : 'default'}
                onClick={() => handleSportToggle(sport.id || sport)}
              />
            ))}
          </Stack>
        )}

        {/* Leagues Filter */}
        {activeTab === 1 && events.metadata?.leagues?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {events.metadata.leagues.map((league, index) => (
              <Chip
                key={league.id || index}
                label={league.name || league}
                clickable
                color={state.preferences.selectedLeagues.includes(league.id || league) ? 'primary' : 'default'}
                onClick={() => handleLeagueToggle(league.id || league)}
              />
            ))}
          </Stack>
        )}

        {/* Teams Filter */}
        {activeTab === 2 && events.metadata?.teams?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {events.metadata.teams.slice(0, 20).map((team, index) => (
              <Chip
                key={team.id || index}
                label={team.name || team}
                clickable
                color={state.preferences.selectedTeams.includes(team.id || team) ? 'primary' : 'default'}
                onClick={() => handleTeamToggle(team.id || team)}
              />
            ))}
            {events.metadata.teams.length > 20 && (
              <Chip label={`+${events.metadata.teams.length - 20} more`} variant="outlined" />
            )}
          </Stack>
        )}
      </Paper>

      {/* Events Display */}
      {events.loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : sortedEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No events found
          </Typography>
          <Typography color="text.secondary">
            Try adjusting your filters or search terms
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Results count */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {sortedEvents.length} events
          </Typography>

          {viewMode === 'grid' ? (
            <Grid container spacing={2}>
              {sortedEvents.map((event, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={event.id || index}>
                  <EventCard event={event} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper>
              <List>
                {sortedEvents.map((event, index) => (
                  <EventListItem key={event.id || index} event={event} />
                ))}
              </List>
            </Paper>
          )}
        </>
      )}

      {/* Floating Action Button for Quick Sync */}
      {sortedEvents.length > 0 && (
        <Fab
          color="primary"
          aria-label="sync all events"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleSyncAll}
          disabled={events.loading}
        >
          {events.loading ? <CircularProgress size={24} /> : <Sync />}
        </Fab>
      )}

      {/* Advanced Filters Dialog */}
      <AdvancedFilters
        open={advancedFiltersOpen}
        onClose={() => setAdvancedFiltersOpen(false)}
        onApplyFilters={handleApplyAdvancedFilters}
      />
    </Container>
  );
});

export default EventsPage;
