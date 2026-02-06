const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'reports', 'log.json');

if (!fs.existsSync(LOG_FILE)) {
    console.log("No log file found.");
    return;
}

try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const logs = JSON.parse(data);

    let summary = {
        total: logs.length,
        ocr_fail: 0,
        checked: 0,
        matches: 0,
        mismatches: 0,
        errors: 0
    };

    console.log("--- LOG SUMMARY ---");
    logs.forEach(entry => {
        if (entry.status === 'OCR_FAIL') {
            summary.ocr_fail++;
        } else if (entry.sheetPrice === 'CHECKED') {
            summary.checked++;
            if (entry.status === 'MATCH' || entry.status === 'ALREADY_VERIFIED') {
                summary.matches++;
                console.log(`[SUCCESS] ${entry.timestamp} | R$ ${entry.extractedPrice} -> ${entry.details}`);
            } else if (entry.status === 'MISMATCH') {
                summary.mismatches++;
                console.log(`[MISMATCH] ${entry.timestamp} | R$ ${entry.extractedPrice} -> Not found in sheet.`);
            } else {
                summary.errors++;
                console.log(`[ERROR] ${entry.timestamp} | ${entry.details}`);
            }
        } else {
            // Other errors
            summary.errors++;
        }
    });

    console.log("\n--- COUNTS ---");
    console.log(`Total Processed: ${summary.total}`);
    console.log(`OCR Failed (No Price): ${summary.ocr_fail}`);
    console.log(`Successfully Checked: ${summary.checked}`);
    console.log(`  - Marked OK / Verified: ${summary.matches}`);
    console.log(`  - Not Found in Sheet: ${summary.mismatches}`);
    console.log(`  - Errors: ${summary.errors}`);

} catch (err) {
    console.error("Error parsing log:", err);
}
