// index.js

import { authorize } from './src/auth.js';
import { runIntegration } from './src/integrationSelector.js';
import { interval } from './src/config.js';

// Choose integration source here: 'gazzetta' or '24media'
const SOURCE = 'gazzetta'; // or use process.env.SOURCE or a CLI arg

async function startScript() {
  try {
    await authorize(async (auth) => {
      await runIntegration(auth, SOURCE);
    });
  } catch (error) {
    console.error('Error executing script:', error);
    console.error('Error details:', error.message);
  }
}

startScript();
setInterval(startScript, interval);
