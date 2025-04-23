import { authorize } from './src/auth.js';
import { fetchTVSchedule } from './src/fetchSchedule.js';
import { interval } from './src/config.js';

// Function to start the script
async function startScript() {
    try {
        await authorize(fetchTVSchedule);
    } catch (error) {
        console.error('Error executing script:', error);
        console.error('Error details:', error.message);
    }
}

// Execute the script immediately
startScript();

// Set up the interval to execute the script periodically
setInterval(startScript, interval);

