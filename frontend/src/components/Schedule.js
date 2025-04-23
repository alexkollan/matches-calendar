import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Schedule = () => {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/schedule');
                setSchedule(response.data);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch schedule');
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div>
            <h1>TV Schedule</h1>
            <ul>
                {schedule.map((match) => (
                    <li key={match.id}>
                        <h2>{match.title}</h2>
                        <p><strong>Date:</strong> {match.date}</p>
                        <p><strong>Time:</strong> {match.time}</p>
                        <p><strong>Channel:</strong> {match.channel}</p>
                        <p><strong>League:</strong> {match.league}</p>
                        <p><strong>Participants:</strong> {match.participants.join(' vs ')}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Schedule;