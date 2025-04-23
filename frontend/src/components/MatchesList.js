import React from 'react';
import { SoccerIcon, BasketballIcon } from '../icons/icons';
import '../styles/styles.css';

const MatchesList = React.memo(({ matches }) => {
    return (
        <ul className="matches-list">
            {matches.map((match) => (
                <li key={match.id} className="match-item">
                    <div className="match-header">
                        <span className="match-icon">
                            {match.sport === 'Ποδόσφαιρο' ? (
                                <SoccerIcon />
                            ) : match.sport === 'Μπάσκετ' ? (
                                <BasketballIcon />
                            ) : null}
                        </span>
                        <h3 className="match-title">{match.title}</h3>
                    </div>
                    <div className="match-details">
                        <div className="match-detail">
                            <strong>Date:</strong> {match.date}
                        </div>
                        <div className="match-detail">
                            <strong>Time:</strong> {match.time}
                        </div>
                        <div className="match-detail">
                            <strong>Channel:</strong> {match.channel}
                        </div>
                        <div className="match-detail">
                            <strong>League:</strong> {match.league}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
});

export default MatchesList;