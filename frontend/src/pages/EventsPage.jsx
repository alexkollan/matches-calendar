import React, { useState, useEffect } from 'react';
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
  Divider
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
  Tv
} from '@mui/icons-material';
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
  const [activeTab, setActiveTab] = useState(0);

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

  // Sync selected events to calendar
  const syncToCalendar = async (eventIds = null) => {
    const eventsToSync = eventIds || sortedEvents.map(e => e.id);
    
    try {
      if (Array.isArray(eventsToSync) && eventsToSync.length > 1) {
        const eventsData = sortedEvents.filter(e => eventsToSync.includes(e.id));
        await events.addBatchToCalendar(eventsData);
      } else {
        const eventId = Array.isArray(eventsToSync) ? eventsToSync[0] : eventsToSync;
        const eventData = sortedEvents.find(e => e.id === eventId);
        if (eventData) {
          await events.addToCalendar(eventData);
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

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
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
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

        <CardActions>
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
          <Button
            size="small"
            variant="outlined"
            startIcon={<Add />}
            onClick={() => addToCalendar(event)}
            disabled={events.loading}
          >
            Add
          </Button>
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
                <Button
                  variant="contained"
                  size="small"
                  startIcon={events.loading ? <CircularProgress size={16} /> : <Sync />}
                  onClick={() => syncToCalendar()}
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
          onChange={(e, newValue) => setActiveTab(newValue)}
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
          onClick={() => syncToCalendar()}
          disabled={events.loading}
        >
          {events.loading ? <CircularProgress size={24} /> : <Sync />}
        </Fab>
      )}
    </Container>
  );
}

export default EventsPage;
