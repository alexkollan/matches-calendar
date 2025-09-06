import React, { useState } from 'react';
import TruncatedText from './TruncatedText.jsx';
import { SoccerIcon, BasketballIcon } from '../icons/icons';
import axios from 'axios';
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

    const getSportIcon = (sport) => {
        if (sport === 'Ποδόσφαιρο' || sport?.toLowerCase().includes('soccer') || sport?.toLowerCase().includes('football')) {
            return <SoccerIcon className="w-5 h-5 text-accent" />;
        } else if (sport === 'Μπάσκετ' || sport?.toLowerCase().includes('basket')) {
            return <BasketballIcon className="w-5 h-5 text-accent" />;
        }
        return (
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    };

    const getSourceBadge = (source) => {
        const sourceConfig = {
            gazzetta: { label: 'Gazzetta', color: 'badge-primary' },
            'media24': { label: '24 Media', color: 'badge-secondary' },
            default: { label: 'Unknown', color: 'badge-secondary' }
        };
        
        const config = sourceConfig[source] || sourceConfig.default;
        return <span className={`badge ${config.color}`}>{config.label}</span>;
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="text-center py-12">
                <svg className="w-12 h-12 text-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-text-primary mb-2">No matches found</h3>
                <p className="text-text-secondary">Try adjusting your filters or check back later.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {matches.map((match) => (
                <div key={match.id} className="card hover:shadow-lg transition-all duration-200">
                    {/* Match Header */}
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 mt-1">
                            {getSportIcon(match.sport)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <TruncatedText
                                text={match.title}
                                maxChars={80}
                                title={`Match Details: ${match.title}`}
                                className="text-text-primary font-semibold text-lg"
                            />
                            {match.league && (
                                <div className="mt-1">
                                    <TruncatedText
                                        text={match.league}
                                        maxChars={50}
                                        title={`League: ${match.league}`}
                                        className="text-text-secondary text-sm"
                                    />
                                </div>
                            )}
                        </div>
                        {match.source && (
                            <div className="flex-shrink-0">
                                {getSourceBadge(match.source)}
                            </div>
                        )}
                    </div>

                    {/* Match Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {match.date && (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <div className="text-xs text-text-secondary">Date</div>
                                    <div className="text-sm text-text-primary font-medium">{match.date}</div>
                                </div>
                            </div>
                        )}

                        {match.time && (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <div className="text-xs text-text-secondary">Time</div>
                                    <div className="text-sm text-text-primary font-medium">{match.time}</div>
                                </div>
                            </div>
                        )}

                        {match.channel && (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs text-text-secondary">Channel</div>
                                    <TruncatedText
                                        text={match.channel}
                                        maxChars={20}
                                        title={`Channel: ${match.channel}`}
                                        className="text-sm text-text-primary font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {match.sport && (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <div>
                                    <div className="text-xs text-text-secondary">Sport</div>
                                    <div className="text-sm text-text-primary font-medium">{match.sport}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="text-xs text-text-secondary">
                            Match ID: {match.id}
                        </div>
                        <button 
                            onClick={() => handleAddToCalendar(match)}
                            disabled={addingToCalendar[match.id]}
                            className="btn btn-primary btn-sm"
                        >
                            {addingToCalendar[match.id] ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Adding...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>Add to Calendar</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default MatchesList;