import express from 'express';
import open from 'open'; // optional, opens browser
import fs from 'fs';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

export function authorize(callback) {
  const credentials = JSON.parse(fs.readFileSync('credentials.json'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we already have a token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return refreshAndExecute(oAuth2Client, callback);
  }

  // If no token, run the local auth flow
  const app = express();

  app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('✅ Auth successful! You can close this tab.');
    server.close();
    callback(oAuth2Client);
  });

  const server = app.listen(3000, () => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });
    console.log('Opening browser to authorize...');
    open(authUrl);
  });

  oAuth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      console.log('🔁 Refresh token saved to token.json');
    }
  });
}

async function refreshAndExecute(oAuth2Client, callback) {
  try {
    const newToken = await oAuth2Client.refreshAccessToken();
    oAuth2Client.setCredentials(newToken.credentials);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(oAuth2Client.credentials));
    console.log('🔄 Token refreshed.');
    callback(oAuth2Client);
  } catch (err) {
    console.error('Error refreshing token:', err);
  }
}
