const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

/**
 * Authorizes the application using stored credentials or generates a new token.
 * @param {function} callback - The callback to execute once authorized.
 */
function authorize(callback) {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');

    fs.readFile(TOKEN_PATH, async (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));

        // Automatically refresh the access token if it's expired
        try {
            const newToken = await oAuth2Client.refreshAccessToken();
            oAuth2Client.setCredentials(newToken.credentials);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(oAuth2Client.credentials));
            console.log('Access token is valid or has been refreshed.');
        } catch (error) {
            console.error('Error refreshing access token:', error);
            return getAccessToken(oAuth2Client, callback);
        }

        callback(oAuth2Client);
    });

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

module.exports = { authorize };
