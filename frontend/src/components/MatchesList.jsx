import React, { useState } from 'react';
import { SoccerIcon, BasketballIcon } from '../icons/icons';
import axios from 'axios';
import '../styles/styles.css';
import { showToast } from './ToastContainer';

const MatchesList = React.memo(({ matches }) => {
    const [addingToCalendar, setAddingToCalendar] = useState({});

    const handleAddToCalendar = async (match) => {
        setAddingToCalendar(prev => ({ ...prev, [match.id]: true }));
        try {
            await axios.post('http://localhost:3001/api/calendar/add', match);
            showToast(`"${match.title}" has been added to your calendar!`, 'success');
        } catch (error) {
            console.error('Error adding match to calendar:', error);
            showToast('Failed to add match to calendar. Please try again.', 'error');
        } finally {
            setAddingToCalendar(prev => ({ ...prev, [match.id]: false }));
        }
    };

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
                            <strong>Date: </strong>&nbsp; {match.date}
                        </div>
                        <div className="match-detail">
                            <strong>Time: </strong>&nbsp; {match.time}
                        </div>
                        <div className="match-detail">
                            <strong>Channel: </strong>&nbsp; {match.channel}
                        </div>                        <div className="match-detail">
                            <strong>League: </strong>&nbsp; {match.league}
                        </div>
                        {match.source && (
                            <div className="match-detail">
                                <strong>Source: </strong>&nbsp;
                                <span className={`source-badge ${match.source}`}>
                                    {match.source === 'gazzetta' ? 'Gazzetta' : '24 Media'}
                                </span>
                            </div>
                        )}
                        <div className="match-action">
                            <button 
                                onClick={() => handleAddToCalendar(match)}
                                className="calendar-button"
                                disabled={addingToCalendar[match.id]}
                            >
                                {addingToCalendar[match.id] ? (
                                    <span className="button-spinner"></span>
                                ) : (
                                    "Add to Calendar"
                                )}
                            </button>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
});

export default MatchesList;