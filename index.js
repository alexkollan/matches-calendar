const { authorize } = require('./src/auth');
const { fetchTVSchedule } = require('./src/fetchSchedule');
const { interval } = require('./src/config');

// Function to start the script
async function startScript() {
    try {
        await authorize(fetchTVSchedule);
    } catch (error) {
        console.error('Error executing script:', error);
    }
}

// Execute the script immediately
startScript();

// Set up the interval to execute the script periodically
setInterval(startScript, interval);

