const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SPREADSHEET_ID = '11-DMkqYeW5z4ep0KpFUXudjWKrzoI4cGRBlS9Zkwut4';
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

let cachedDoc = null;

async function getDoc() {
    if (cachedDoc) return cachedDoc;

    if (!fs.existsSync(TOKEN_PATH) || !fs.existsSync(CREDENTIALS_PATH)) {
        console.error("Auth files missing. Please run setup first.");
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

        console.log(`[AUTH] Authenticated and loaded doc: ${doc.title}`);
        cachedDoc = doc; // Cache it!
        return doc;
    } catch (e) {
        console.error("Error loading spreadsheet with OAuth:", e);
        return null;
    }
}

/**
 * Converts Excel Serial Date to JS Date
 * @param {number} serial 
 */
function excelDateToJSDate(serial) {
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function getMonthNamePortuguese(monthIndex) {
    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[monthIndex];
}

/**
 * Searches for a row that matches criteria and updates it
 * @param {string[]} searchPricesStr - Array of Prices found in OCR
 * @param {string} searchDateStr - Date found in OCR
 * @param {string} ocrText - Full text from OCR for keyword matching
 */
async function checkAndUpdateRow(searchPricesStr, searchDateStr, ocrText = "") {
    const doc = await getDoc();
    if (!doc) return { status: 'ERROR', message: 'Auth failed' };

    // Ensure searchPricesStr is an array
    const pricesList = Array.isArray(searchPricesStr) ? searchPricesStr : [searchPricesStr];

    // Normalize logic for Target Sheet
    // If we have a date, use it to target month. If not, default to current/Feb 2026?.
    // User said: "It doesn't need to be same day, just verify the Month."

    let targetMonthIndex = -1; // 0-11
    let targetYear = 2026; // Default

    if (searchDateStr) {
        const parts = searchDateStr.split(/[/\-\.]/);
        if (parts.length === 3) {
            targetMonthIndex = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            targetYear = y < 100 ? 2000 + y : y;
        }
    } else {
        // Default to current month if no date found? Or try to deduce?
        // Let's assume current execution month if unknown, or maybe search ALL sheets?
        // Performance wise, better to target. Let's stick with specific targeting if possible.
        // If unknown, fallback to "Fevereiro" (User context)
        targetMonthIndex = 1; // Feb
    }

    const monthName = getMonthNamePortuguese(targetMonthIndex);
    // Try to find sheet by Month Name.
    const monthRegex = new RegExp(monthName, 'i');

    let sheet = doc.sheetsByIndex.find(s => monthRegex.test(s.title));

    if (!sheet) {
        console.log(`Could not find sheet for ${monthName}. Trying fallback to current month/default.`);
        // Try exact title "Fevereiro 2026" or similar
        sheet = doc.sheetsByIndex.find(s => s.title.includes('Fevereiro'));
        if (!sheet) return { status: 'ERROR', message: `Sheet for ${monthName} not found.` };
    }

    console.log(`Targeting Sheet: "${sheet.title}"`);
    await sheet.loadCells('A1:L1000'); // Optimize range if needed

    // Normalize Search Prices to floats
    const searchPrices = pricesList.map(p => parseFloat(p.replace('.', '').replace(',', '.'))).filter(n => !isNaN(n));
    const searchSum = searchPrices.reduce((a, b) => a + b, 0);

    // Check for Keyword "Almoço Nini" (flexible)
    const keywordRegex = /almo[cç]o\s*nini/i;
    const hasKeyword = keywordRegex.test(ocrText);

    console.log(`Searching criteria - Prices: ${searchPrices.join(', ')} (Sum: ${searchSum}), HasKeyword: ${hasKeyword}`);

    const START_ROW = 9;
    const actualMaxRow = Math.min(1000, sheet.rowCount);

    for (let r = START_ROW; r < actualMaxRow; r++) {
        const valCell = sheet.getCell(r, 7); // Col H (Index 7) - Value
        const statusCell = sheet.getCell(r, 9); // Col J (Index 9) - Status

        const sheetValRaw = valCell.value;
        if (sheetValRaw === null || sheetValRaw === undefined) continue;

        const sheetVal = Math.abs(parseFloat(sheetValRaw));

        // MATCHING STRATEGIES
        let isMatch = false;

        // 1. Direct Match (Any single price matches row)
        // Check if ANY of the found prices matches this row
        if (searchPrices.some(p => Math.abs(sheetVal - p) < 0.05)) {
            isMatch = true;
        }

        // 2. Summation Match (Sum of all found matches this row)
        // e.g. Receipt has 10.00 and 20.00 -> Matches row with 30.00
        if (!isMatch && Math.abs(sheetVal - searchSum) < 0.05) {
            isMatch = true;
        }

        // 3. Keyword Match (Override)
        if (!isMatch && hasKeyword) {
            // Need logical constraint? User said verify price.
            // If keyword present, do we trust it blindly? 
            // "Verify prices... check if 2 prices sum up..."
            // Let's assume Keyword helps with Date overrides mostly, but if user implies Nini is special...
            // Let's stick to Price Logic being king.
        }

        if (isMatch) {
            // Check if already OK
            if (statusCell.value === 'ok') {
                // Keep searching? Row might be duplicate value?
                // User said: "Check if João has 2 coupons".
                // If this row is already OK, we shouldn't claim it again unless we are sure.
                // But maybe there is ANOTHER row with same value?
                // Let's 'continue' to find a non-ok row.
                continue;
            }

            // Mark it
            statusCell.value = 'ok';
            await sheet.saveUpdatedCells();
            return { status: 'MATCH', message: `Row ${r + 1} updated to 'ok' (Match Val: ${sheetVal}).` };
        }
    }

    // If we finished loop and found 'ok' rows but no 'pending' rows?
    // Return ALREADY_VERIFIED if we found at least one match that was already ok.
    // (Logic simplified here, ideally we track if we saw verified candidate).

    return { status: 'MISMATCH', message: 'No matching pending row found.' };
}

module.exports = {
    checkAndUpdateRow
};
