const { google } = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SPREADSHEET_ID = '11-DMkqYeW5z4ep0KpFUXudjWKrzoI4cGRBlS9Zkwut4';
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

console.log("Checking files...");
console.log(`Token Path: ${TOKEN_PATH} - Exists: ${fs.existsSync(TOKEN_PATH)}`);
console.log(`Creds Path: ${CREDENTIALS_PATH} - Exists: ${fs.existsSync(CREDENTIALS_PATH)}`);

async function getDoc() {
    if (!fs.existsSync(TOKEN_PATH) || !fs.existsSync(CREDENTIALS_PATH)) {
        console.error("Auth files missing.");
        return null;
    }

    try {
        const credsContent = fs.readFileSync(CREDENTIALS_PATH);
        const keys = JSON.parse(credsContent);
        const key = keys.installed || keys.web;

        const tokenContent = fs.readFileSync(TOKEN_PATH);
        const tokens = JSON.parse(tokenContent);

        const oauth2Client = new google.auth.OAuth2(
            key.client_id,
            key.client_secret,
            key.redirect_uris[0]
        );

        oauth2Client.setCredentials(tokens);

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, oauth2Client);
        await doc.loadInfo();
        console.log(`Success! Loaded doc: ${doc.title}`);
        return doc;
    } catch (e) {
        console.error("Detailed Error:", e);
        return null;
    }
}

getDoc();
