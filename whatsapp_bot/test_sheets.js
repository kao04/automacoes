const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SPREADSHEET_ID = '11-DMkqYeW5z4ep0KpFUXudjWKrzoI4cGRBlS9Zkwut4';
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function main() {
    console.log("Testing connection...");

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

        const sheet = doc.sheetsByIndex[0];
        await sheet.loadCells('A1:M30');

        let output = "";
        output += `Document Title: ${doc.title}\n`;
        output += `Sheet 1 Title: ${sheet.title}\n`;
        output += "--- Rows Preview ---\n";

        for (let r = 9; r < 20; r++) { // Start from row 9 where data seems to be
            const rowValues = [];
            for (let c = 7; c < 12; c++) { // Read H to L
                const cell = sheet.getCell(r, c);
                rowValues.push(cell.value ?? "");
            }
            output += `Row ${r} (H-L): ${rowValues.join(' | ')}\n`;
        }

        fs.writeFileSync(path.join(__dirname, 'sheet_structure.txt'), output);
        console.log("Structure saved to sheet_structure.txt");

    } catch (e) {
        console.error("Connection failed:", e);
    }
}

main();
