import React, { useState } from 'react';
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
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'teams', label: 'Teams', icon: '👥' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'ui', label: 'Interface', icon: '🎨' },
    { id: 'account', label: 'Account', icon: '👤' }
  ];

  if (!auth.isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            Authentication Required
          </h2>
          <p className="text-text-secondary">
            Please sign in to access settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-primary mb-2">
          Settings
        </h1>
        <p className="text-text-secondary">
          Manage your account, preferences, and application configuration.
        </p>
      </div>

      {/* Settings Navigation */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-default transition-colors ${
                activeTab === tab.id 
                  ? 'bg-accent text-white' 
                  : 'bg-background hover:bg-gray-800 text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="card p-6">
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
      </div>
    </div>
  );
}

/**
 * Preferences tab component
 */
function PreferencesTab({ preferences, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">General Preferences</h2>
        <p className="text-text-secondary mb-6">Configure data sources and filtering options</p>
      </div>

      <div className="space-y-6">
        {/* Data Sources */}
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-4">Data Sources</h3>
          <div className="space-y-3">
            {preferences.dataSources.map(source => (
              <div key={source.id} className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={source.enabled}
                    onChange={(e) => {
                      const updated = preferences.dataSources.map(s => 
                        s.id === source.id ? { ...s, enabled: e.target.checked } : s
                      );
                      handleChange('dataSources', updated);
                    }}
                    className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
                  />
                  <div>
                    <div className="text-text-primary font-medium">{source.name}</div>
                    <div className="text-text-secondary text-sm">{source.description}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${
                  source.enabled ? 'bg-success/20 text-success' : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {source.enabled ? 'Active' : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-sync */}
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-4">Synchronization</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
              <div>
                <div className="text-text-primary font-medium">Auto-sync Events</div>
                <div className="text-text-secondary text-sm">Automatically sync new events to calendar</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoSync}
                onChange={(e) => handleChange('autoSync', e.target.checked)}
                className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
              <div>
                <div className="text-text-primary font-medium">Sync Interval</div>
                <div className="text-text-secondary text-sm">How often to check for new events (minutes)</div>
              </div>
              <input
                type="number"
                value={preferences.syncInterval}
                onChange={(e) => handleChange('syncInterval', parseInt(e.target.value))}
                min="5"
                max="1440"
                className="w-20 px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Team Selection</h2>
        <p className="text-text-secondary mb-6">Choose which teams to track and sync</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableTeams.map(team => (
          <div
            key={team.id}
            onClick={() => handleTeamToggle(team.id)}
            className={`p-4 rounded-default border cursor-pointer transition-colors ${
              selectedTeams.includes(team.id)
                ? 'border-accent bg-accent/10'
                : 'border-border bg-background hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedTeams.includes(team.id)}
                onChange={() => handleTeamToggle(team.id)}
                className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
              />
              <div>
                <div className="text-text-primary font-medium">{team.name}</div>
                <div className="text-text-secondary text-sm">{team.league}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Calendar Integration</h2>
        <p className="text-text-secondary mb-6">Configure Google Calendar sync settings</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
          <div>
            <div className="text-text-primary font-medium">Enable Calendar Integration</div>
            <div className="text-text-secondary text-sm">Connect to Google Calendar</div>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
          />
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-text-primary font-medium">Calendar ID</span>
            <input
              type="text"
              value={settings.calendarId}
              onChange={(e) => handleChange('calendarId', e.target.value)}
              placeholder="primary"
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-default focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
            />
          </label>

          <label className="block">
            <span className="text-text-primary font-medium">Event Prefix</span>
            <input
              type="text"
              value={settings.eventPrefix}
              onChange={(e) => handleChange('eventPrefix', e.target.value)}
              placeholder="[MATCH] "
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-default focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
            />
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
          <div>
            <div className="text-text-primary font-medium">Set Reminders</div>
            <div className="text-text-secondary text-sm">Add reminders to calendar events</div>
          </div>
          <input
            type="checkbox"
            checked={settings.setReminders}
            onChange={(e) => handleChange('setReminders', e.target.checked)}
            className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
          />
        </div>

        {settings.setReminders && (
          <label className="block">
            <span className="text-text-primary font-medium">Reminder Time (minutes)</span>
            <input
              type="number"
              value={settings.reminderMinutes}
              onChange={(e) => handleChange('reminderMinutes', parseInt(e.target.value))}
              min="0"
              max="1440"
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-default focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
            />
          </label>
        )}
      </div>
    </div>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Interface Settings</h2>
        <p className="text-text-secondary mb-6">Customize the look and feel of the application</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
          <div>
            <div className="text-text-primary font-medium">Dark Mode</div>
            <div className="text-text-secondary text-sm">Use dark theme</div>
          </div>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) => handleChange('darkMode', e.target.checked)}
            className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-background rounded-default border border-border">
          <div>
            <div className="text-text-primary font-medium">Compact View</div>
            <div className="text-text-secondary text-sm">Use smaller spacing and elements</div>
          </div>
          <input
            type="checkbox"
            checked={settings.compactView}
            onChange={(e) => handleChange('compactView', e.target.checked)}
            className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
          />
        </div>

        <label className="block">
          <span className="text-text-primary font-medium">Items per Page</span>
          <select
            value={settings.itemsPerPage}
            onChange={(e) => handleChange('itemsPerPage', parseInt(e.target.value))}
            className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-default focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );
}

/**
 * Account tab component
 */
function AccountTab({ user, onSignOut }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Account Information</h2>
        <p className="text-text-secondary mb-6">Manage your account and authentication</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-background rounded-default border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="text-text-primary font-medium">{user?.name || 'Unknown User'}</div>
              <div className="text-text-secondary text-sm">{user?.email || 'No email'}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onSignOut}
            className="btn-error"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
