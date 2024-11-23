const { authorize } = require('./src/auth');
const { fetchTVSchedule } = require('./src/fetchSchedule');

// Start the script
authorize(fetchTVSchedule);
