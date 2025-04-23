import React from 'react';
import '../styles/styles.css';

const LeaguesList = React.memo(({ filteredLeagues, selectedLeagues, handleLeagueChange }) => {
    if (filteredLeagues.length === 0) {
        return (
            <p className="no-results">No leagues match your search</p>
        );
    }

    return (
        <div className="checkbox-grid leagues-grid">
            {filteredLeagues.map((league) => (
                <div className="checkbox-item" key={league}>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={selectedLeagues.includes(league)}
                            onChange={() => handleLeagueChange(league)}
                            className="checkbox-input league-checkbox"
                        />
                        <span className="checkbox-text">{league}</span>
                    </label>
                </div>
            ))}
        </div>
    );
});

export default LeaguesList;