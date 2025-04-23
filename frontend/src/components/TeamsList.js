import React from 'react';
import '../styles/styles.css';

const TeamsList = React.memo(({ filteredTeams, selectedTeams, handleTeamChange }) => {
    if (filteredTeams.length === 0) {
        return (
            <p className="no-results">No teams match your search</p>
        );
    }

    return (
        <div className="checkbox-grid teams-grid">
            {filteredTeams.map((team) => (
                <div className="checkbox-item" key={team}>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={selectedTeams.includes(team)}
                            onChange={() => handleTeamChange(team)}
                            className="checkbox-input"
                        />
                        <span className="checkbox-text">{team}</span>
                    </label>
                </div>
            ))}
        </div>
    );
});

export default TeamsList;