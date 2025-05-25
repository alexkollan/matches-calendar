import React from 'react';
import './App.css'; // Assuming custom styles will be added here
import TeamFilter from './components/TeamFilter';
import ToastContainer from './components/ToastContainer';

function App() {
    return (
        <div className="app-container"> {/* Replace ThemeProvider with a div wrapper */}
            <TeamFilter />
            <ToastContainer />
        </div>
    );
}

export default App;
