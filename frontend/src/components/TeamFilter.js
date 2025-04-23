import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import TeamsList from './TeamsList';
import LeaguesList from './LeaguesList';
import MatchesList from './MatchesList';
import { SearchIcon, RefreshIcon, ExpandMoreIcon, ExpandLessIcon, 
         ClearIcon, SoccerIcon, BasketballIcon } from '../icons/icons';
import '../styles/styles.css';
import { saveToStorage, loadFromStorage } from '../utils/storage';

// Storage keys
const TEAMS_STORAGE_KEY = 'sportsCalendar_selectedTeams';
const LEAGUES_STORAGE_KEY = 'sportsCalendar_selectedLeagues';
const TEAMS_EXPANDED_KEY = 'sportsCalendar_teamsExpanded';
const LEAGUES_EXPANDED_KEY = 'sportsCalendar_leaguesExpanded';

const TeamFilter = () => {
    // State management
    const [teams, setTeams] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [selectedLeagues, setSelectedLeagues] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [leagueSearchTerm, setLeagueSearchTerm] = useState('');
    
    // Load expansion states from localStorage
    const [teamsExpanded, setTeamsExpanded] = useState(() => 
        loadFromStorage(TEAMS_EXPANDED_KEY, true)
    );
    const [leaguesExpanded, setLeaguesExpanded] = useState(() => 
        loadFromStorage(LEAGUES_EXPANDED_KEY, true)
    );

    // Toggle panel expansion
    const toggleTeamsExpanded = useCallback(() => {
        const newState = !teamsExpanded;
        setTeamsExpanded(newState);
        saveToStorage(TEAMS_EXPANDED_KEY, newState);
    }, [teamsExpanded]);

    const toggleLeaguesExpanded = useCallback(() => {
        const newState = !leaguesExpanded;
        setLeaguesExpanded(newState);
        saveToStorage(LEAGUES_EXPANDED_KEY, newState);
    }, [leaguesExpanded]);

    // Load data from API
    const fetchData = useCallback(async () => {
        setDataLoading(true);
        try {
            const response = await axios.get('http://localhost:3001/api/teams');
            const sortedTeams = response.data.sort();
            setTeams(sortedTeams);
            
            const leaguesResponse = await axios.get('http://localhost:3001/api/leagues');
            const sortedLeagues = leaguesResponse.data.sort();
            setLeagues(sortedLeagues);
            
            // Restore selections from localStorage
            restoreSelections(sortedTeams, sortedLeagues);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setDataLoading(false);
        }
    }, []);

    // Restore selections from localStorage
    const restoreSelections = useCallback((availableTeams, availableLeagues) => {
        // Restore teams
        const savedTeams = loadFromStorage(TEAMS_STORAGE_KEY, []);
        if (savedTeams.length > 0) {
            const validTeams = savedTeams.filter(team => availableTeams.includes(team));
            setSelectedTeams(validTeams);
            
            if (validTeams.length !== savedTeams.length) {
                saveToStorage(TEAMS_STORAGE_KEY, validTeams);
            }
        }
        
        // Restore leagues
        const savedLeagues = loadFromStorage(LEAGUES_STORAGE_KEY, []);
        if (savedLeagues.length > 0) {
            const validLeagues = savedLeagues.filter(league => availableLeagues.includes(league));
            setSelectedLeagues(validLeagues);
            
            if (validLeagues.length !== savedLeagues.length) {
                saveToStorage(LEAGUES_STORAGE_KEY, validLeagues);
            }
        }
    }, []);

    // Initial data load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle team selection/deselection
    const handleTeamChange = useCallback((team) => {
        setSelectedTeams((prev) => {
            const newSelection = prev.includes(team) 
                ? prev.filter((t) => t !== team) 
                : [...prev, team];
            
            saveToStorage(TEAMS_STORAGE_KEY, newSelection);
            return newSelection;
        });
    }, []);

    // Handle league selection/deselection
    const handleLeagueChange = useCallback((league) => {
        setSelectedLeagues((prev) => {
            const newSelection = prev.includes(league) 
                ? prev.filter((l) => l !== league) 
                : [...prev, league];
            
            saveToStorage(LEAGUES_STORAGE_KEY, newSelection);
            return newSelection;
        });
    }, []);

    // Fetch matches
    const fetchMatches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3001/api/schedule', {
                selectedTeams,
                selectedLeagues
            });
            setMatches(response.data);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedTeams, selectedLeagues]);

    // Filter teams and leagues based on search term
    const filteredTeams = teams.filter(team => 
        team.toLowerCase().includes(teamSearchTerm.toLowerCase())
    );

    const filteredLeagues = leagues.filter(league => 
        league.toLowerCase().includes(leagueSearchTerm.toLowerCase())
    );
    
    // Clear search input handlers
    const clearTeamSearch = () => setTeamSearchTerm('');
    const clearLeagueSearch = () => setLeagueSearchTerm('');

    return (
        <div className="container">
            <h1 className="main-title">Sports Matches Calendar</h1>
            
            <div className="grid">
                {/* Teams Panel */}
                <div className="panel teams-panel">
                    <div className={`panel-wrapper ${teamsExpanded ? 'expanded' : 'collapsed'}`}>
                        <div className="panel-header">
                            <div className="panel-title">
                                <h2>Teams</h2>
                                <button 
                                    className="icon-button" 
                                    onClick={toggleTeamsExpanded}
                                    aria-label={teamsExpanded ? "Collapse teams" : "Expand teams"}
                                >
                                    {teamsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </button>
                            </div>
                            <button 
                                className="icon-button tooltip" 
                                onClick={fetchData} 
                                disabled={dataLoading}
                                data-tooltip="Refresh data"
                            >
                                <RefreshIcon />
                            </button>
                        </div>
                        
                        {dataLoading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <>
                                {/* Selected teams are always visible */}
                                <div className={`selection-summary ${teamsExpanded ? 'with-border' : ''}`}>
                                    <p className="selection-count">{selectedTeams.length} teams selected</p>
                                    <div className="chips-container">
                                        {selectedTeams.map(team => (
                                            <span key={team} className="chip primary">
                                                {team}
                                                <button 
                                                    className="chip-delete" 
                                                    onClick={() => handleTeamChange(team)}
                                                    aria-label={`Remove ${team}`}
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Collapsible content */}
                                <div className={`collapsible-content ${teamsExpanded ? 'open' : ''}`}>
                                    <div className="search-container">
                                        <div className="search-input-wrapper">
                                            <SearchIcon />
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder="Search teams..."
                                                value={teamSearchTerm}
                                                onChange={(e) => setTeamSearchTerm(e.target.value)}
                                            />
                                            {teamSearchTerm && (
                                                <button 
                                                    className="clear-button"
                                                    onClick={clearTeamSearch}
                                                    aria-label="Clear search"
                                                >
                                                    <ClearIcon />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="scrollable-content">
                                        <TeamsList 
                                            filteredTeams={filteredTeams}
                                            selectedTeams={selectedTeams}
                                            handleTeamChange={handleTeamChange}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Leagues Panel */}
                <div className="panel leagues-panel">
                    <div className={`panel-wrapper ${leaguesExpanded ? 'expanded' : 'collapsed'}`}>
                        <div className="panel-header">
                            <div className="panel-title">
                                <h2>Leagues</h2>
                                <button 
                                    className="icon-button" 
                                    onClick={toggleLeaguesExpanded}
                                    aria-label={leaguesExpanded ? "Collapse leagues" : "Expand leagues"}
                                >
                                    {leaguesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </button>
                            </div>
                        </div>
                        
                        {dataLoading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <>
                                {/* Selected leagues are always visible */}
                                <div className={`selection-summary ${leaguesExpanded ? 'with-border' : ''}`}>
                                    <p className="selection-count">{selectedLeagues.length} leagues selected</p>
                                    <div className="chips-container">
                                        {selectedLeagues.map(league => (
                                            <span key={league} className="chip secondary">
                                                {league}
                                                <button 
                                                    className="chip-delete" 
                                                    onClick={() => handleLeagueChange(league)}
                                                    aria-label={`Remove ${league}`}
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Collapsible content */}
                                <div className={`collapsible-content ${leaguesExpanded ? 'open' : ''}`}>
                                    <div className="search-container">
                                        <div className="search-input-wrapper">
                                            <SearchIcon />
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder="Search leagues..."
                                                value={leagueSearchTerm}
                                                onChange={(e) => setLeagueSearchTerm(e.target.value)}
                                            />
                                            {leagueSearchTerm && (
                                                <button 
                                                    className="clear-button"
                                                    onClick={clearLeagueSearch}
                                                    aria-label="Clear search"
                                                >
                                                    <ClearIcon />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="scrollable-content">
                                        <LeaguesList 
                                            filteredLeagues={filteredLeagues}
                                            selectedLeagues={selectedLeagues}
                                            handleLeagueChange={handleLeagueChange}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Matches Panel */}
                <div className="panel matches-panel">
                    <div className="panel-wrapper">
                        <div className="panel-header">
                            <h2>Matches</h2>
                            <span className="match-count">{matches.length} matches found</span>
                        </div>
                        
                        <div className="matches-content">
                            {loading ? (
                                <div className="loading-container">
                                    <div className="spinner"></div>
                                </div>
                            ) : matches.length > 0 ? (
                                <MatchesList matches={matches} />
                            ) : (
                                <div className="no-matches">
                                    <p>Select teams/leagues and click "Find Matches"</p>
                                    <button
                                        className="primary-button"
                                        onClick={fetchMatches}
                                        disabled={selectedTeams.length === 0 && selectedLeagues.length === 0 || loading}
                                    >
                                        <SearchIcon /> Find Matches
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {(selectedTeams.length > 0 || selectedLeagues.length > 0) && (
                            <div className="panel-footer">
                                <button
                                    className="primary-button full-width"
                                    onClick={fetchMatches}
                                    disabled={loading}
                                >
                                    <SearchIcon /> Find Matches
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamFilter;