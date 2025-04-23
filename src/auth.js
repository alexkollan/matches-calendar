import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

/**
 * Authorizes the application using stored credentials or generates a new token.
 * @param {function} callback - The callback to execute once authorized.
 */
export function authorize(callback) {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');

    try {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));

        // Immediately execute with the loaded token
        refreshAndExecute(oAuth2Client, callback);
    } catch (err) {
        // If token doesn't exist or can't be read
        getAccessToken(oAuth2Client, callback);
    }

    // Listen for token updates to store the new refresh token if issued
    oAuth2Client.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
            const currentToken = JSON.parse(fs.readFileSync(TOKEN_PATH));
            const updatedToken = { ...currentToken, ...tokens };
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken));
            console.log('New refresh token stored to', TOKEN_PATH);
        }
    });
}

/**
 * Refreshes the token if needed and executes the callback
 */
async function refreshAndExecute(oAuth2Client, callback) {
    try {
        const newToken = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newToken.credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(oAuth2Client.credentials));
        console.log('Access token is valid or has been refreshed.');
        callback(oAuth2Client);
    } catch (error) {
        console.error('Error refreshing access token:', error);
        getAccessToken(oAuth2Client, callback);
    }
}

/**
 * Prompts the user to authorize the app and generates a new token.
 * @param {google.auth.OAuth2} oAuth2Client - OAuth2 client.
 * @param {function} callback - The callback to execute once authorized.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this URL:', authUrl);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('Token stored to', TOKEN_PATH);
            callback(oAuth2Client);
        });
    });
}
