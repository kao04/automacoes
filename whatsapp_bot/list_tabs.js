const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SPREADSHEET_ID = '11-DMkqYeW5z4ep0KpFUXudjWKrzoI4cGRBlS9Zkwut4';
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function main() {
    console.log("Listing Sheets...");

    try {
        const credsContent = fs.readFileSync(CREDENTIALS_PATH);
        const keys = JSON.parse(credsContent);
        const key = keys.installed || keys.web;
        const tokenContent = fs.readFileSync(TOKEN_PATH);
        const tokens = JSON.parse(tokenContent);
        const oauth2Client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris[0]);
        oauth2Client.setCredentials(tokens);

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, oauth2Client);
        await doc.loadInfo();

        let output = `Document Title: ${doc.title}\n--- Sheets Available ---\n`;
        doc.sheetsByIndex.forEach((sheet, index) => {
            output += `Index ${index}: "${sheet.title}"\n`;
        });
        fs.writeFileSync(path.join(__dirname, 'tabs.txt'), output);
        console.log("Saved tabs to tabs.txt");

    } catch (e) {
        console.error("Connection failed:", e);
    }
}

main();
