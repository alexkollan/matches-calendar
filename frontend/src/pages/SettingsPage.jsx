import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Alert,
  Stack,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  MenuItem
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Palette as PaletteIcon,
  AccountCircle as AccountIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext.jsx';

/**
 * Settings page component
 * Provides app configuration and preferences
 */
function SettingsPage() {
  const { 
    auth, 
    state, 
    events,
    updatePreferences,
    updateCalendarSettings,
    updateUISettings,
    setSelectedTeams,
    setSelectedLeagues,
    setSelectedSports,
    addNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState('preferences');

  // Handle preference updates
  const handlePreferenceUpdate = (updates) => {
    updatePreferences(updates);
    addNotification({
      type: 'success',
      title: 'Settings Updated',
      message: 'Your preferences have been saved'
    });
  };

  // Handle calendar settings update
  const handleCalendarUpdate = (updates) => {
    updateCalendarSettings(updates);
    addNotification({
      type: 'success',
      title: 'Calendar Settings Updated',
      message: 'Calendar integration settings have been saved'
    });
  };

  // Handle UI settings update
  const handleUIUpdate = (updates) => {
    updateUISettings(updates);
    addNotification({
      type: 'success',
      title: 'UI Settings Updated',
      message: 'Interface settings have been saved'
    });
  };

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: <SettingsIcon /> },
    { id: 'teams', label: 'Teams', icon: <PeopleIcon /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon /> },
    { id: 'ui', label: 'Interface', icon: <PaletteIcon /> },
    { id: 'account', label: 'Account', icon: <AccountIcon /> }
  ];

  if (!auth.isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ textAlign: 'center', py: 8, px: 4 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please sign in to access settings
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account, preferences, and application configuration.
        </Typography>
      </Box>

      {/* Settings Navigation */}
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map(tab => (
            <Tab
              key={tab.id}
              value={tab.id}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Settings Content */}
      <Paper elevation={3} sx={{ p: 3 }}>
        {activeTab === 'preferences' && (
          <PreferencesTab 
            preferences={state.preferences}
            onUpdate={handlePreferenceUpdate}
          />
        )}
        
        {activeTab === 'teams' && (
          <TeamsTab 
            selectedTeams={state.preferences.selectedTeams}
            availableTeams={events.availableTeams}
            onUpdate={setSelectedTeams}
          />
        )}
        
        {activeTab === 'calendar' && (
          <CalendarTab 
            settings={state.preferences.calendarIntegration}
            onUpdate={handleCalendarUpdate}
          />
        )}
        
        {activeTab === 'ui' && (
          <UITab 
            settings={state.preferences.ui}
            onUpdate={handleUIUpdate}
          />
        )}
        
        {activeTab === 'account' && (
          <AccountTab 
            user={auth.user}
            onSignOut={auth.signOut}
          />
        )}
      </Paper>
    </Container>
  );
}

/**
 * Preferences tab component
 */
function PreferencesTab({ preferences, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({ [key]: value });
  };

  // Convert sources object to dataSources array format
  const dataSources = Object.entries(preferences.sources || {}).map(([key, enabled]) => ({
    id: key,
    name: key === 'media24' ? 'Media24' : key === 'gazzetta' ? 'Gazzetta dello Sport' : key,
    description: key === 'media24' ? 'South African sports news' : key === 'gazzetta' ? 'Italian sports news' : `${key} sports data`,
    enabled
  }));

  const handleSourceChange = (sourceId, enabled) => {
    const updatedSources = {
      ...preferences.sources,
      [sourceId]: enabled
    };
    handleChange('sources', updatedSources);
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h2" gutterBottom>
          General Preferences
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure data sources and filtering options
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Data Sources */}
        <Box>
          <Typography variant="h5" component="h3" gutterBottom>
            Data Sources
          </Typography>
          <Stack spacing={2}>
            {dataSources.map(source => (
              <Card key={source.id} variant="outlined">
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={source.enabled}
                            onChange={(e) => handleSourceChange(source.id, e.target.checked)}
                          />
                        }
                        label=""
                      />
                      <Box>
                        <Typography variant="subtitle1" component="div">
                          {source.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {source.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={source.enabled ? 'Active' : 'Disabled'}
                      color={source.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* Auto-sync */}
        <Box>
          <Typography variant="h5" component="h3" gutterBottom>
            Synchronization
          </Typography>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" component="div">
                      Auto-sync Events
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Automatically sync new events to calendar
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.autoSync || false}
                    onChange={(e) => handleChange('autoSync', e.target.checked)}
                  />
                </Box>
              </CardContent>
            </Card>
            
            <Card variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" component="div">
                      Sync Interval
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      How often to check for new events (minutes)
                    </Typography>
                  </Box>
                  <TextField
                    type="number"
                    value={preferences.syncInterval || 30}
                    onChange={(e) => handleChange('syncInterval', parseInt(e.target.value))}
                    inputProps={{ min: 5, max: 1440 }}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
}

/**
 * Teams tab component
 */
function TeamsTab({ selectedTeams, availableTeams, onUpdate }) {
  const handleTeamToggle = (teamId) => {
    const updated = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    onUpdate(updated);
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h2" gutterBottom>
          Team Selection
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose which teams to track and sync
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {(availableTeams || []).map(team => (
          <Grid item xs={12} sm={6} md={4} key={team.id}>
            <Card 
              variant="outlined"
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: selectedTeams.includes(team.id) ? 2 : 1,
                borderColor: selectedTeams.includes(team.id) ? 'primary.main' : 'divider',
                bgcolor: selectedTeams.includes(team.id) ? 'primary.light' : 'background.paper',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: selectedTeams.includes(team.id) ? 'primary.light' : 'action.hover'
                }
              }}
              onClick={() => handleTeamToggle(team.id)}
            >
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Switch
                    checked={selectedTeams.includes(team.id)}
                    onChange={() => handleTeamToggle(team.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Box>
                    <Typography variant="subtitle1" component="div">
                      {team.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.league}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

/**
 * Calendar tab component
 */
function CalendarTab({ settings, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({ [key]: value });
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h2" gutterBottom>
          Calendar Integration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure Google Calendar sync settings
        </Typography>
      </Box>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" component="div">
                  Enable Calendar Integration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect to Google Calendar
                </Typography>
              </Box>
              <Switch
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Calendar ID"
            value={settings.calendarId}
            onChange={(e) => handleChange('calendarId', e.target.value)}
            placeholder="primary"
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Event Prefix"
            value={settings.eventPrefix}
            onChange={(e) => handleChange('eventPrefix', e.target.value)}
            placeholder="[MATCH] "
            fullWidth
            variant="outlined"
          />
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" component="div">
                  Set Reminders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add reminders to calendar events
                </Typography>
              </Box>
              <Switch
                checked={settings.setReminders}
                onChange={(e) => handleChange('setReminders', e.target.checked)}
              />
            </Box>
          </CardContent>
        </Card>

        {settings.setReminders && (
          <TextField
            label="Reminder Time (minutes)"
            type="number"
            value={settings.reminderMinutes}
            onChange={(e) => handleChange('reminderMinutes', parseInt(e.target.value))}
            inputProps={{ min: 0, max: 1440 }}
            fullWidth
            variant="outlined"
          />
        )}
      </Stack>
    </Stack>
  );
}

/**
 * UI tab component
 */
function UITab({ settings, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({ [key]: value });
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h2" gutterBottom>
          Interface Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize the look and feel of the application
        </Typography>
      </Box>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" component="div">
                  Dark Mode
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use dark theme
                </Typography>
              </Box>
              <Switch
                checked={settings.darkMode || false}
                onChange={(e) => handleChange('darkMode', e.target.checked)}
              />
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" component="div">
                  Compact View
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use smaller spacing and elements
                </Typography>
              </Box>
              <Switch
                checked={settings.compactView || false}
                onChange={(e) => handleChange('compactView', e.target.checked)}
              />
            </Box>
          </CardContent>
        </Card>

        <TextField
          select
          label="Items per Page"
          value={settings.itemsPerPage || 25}
          onChange={(e) => handleChange('itemsPerPage', parseInt(e.target.value))}
          fullWidth
          variant="outlined"
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </TextField>
      </Stack>
    </Stack>
  );
}

/**
 * Account tab component
 */
function AccountTab({ user, onSignOut }) {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h2" gutterBottom>
          Account Information
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account and authentication
        </Typography>
      </Box>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'primary.main',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.contrastText',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}
              >
                {user?.name?.charAt(0) || 'U'}
              </Box>
              <Box>
                <Typography variant="subtitle1" component="div">
                  {user?.name || 'Unknown User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || 'No email'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={onSignOut}
            size="large"
            sx={{ alignSelf: 'flex-start' }}
          >
            Sign Out
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}

export default SettingsPage;
