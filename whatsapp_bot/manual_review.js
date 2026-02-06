const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const { checkAndUpdateRow } = require('./google_sheets_service');
const { moveImage } = require('./logger');

const FAILURES_DIR = path.join(__dirname, 'reports', 'images', 'failures');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Open image command (Windows specific)
function openImage(filePath) {
    exec(`start "" "${filePath}"`, (err) => {
        if (err) console.error("Could not open image:", err);
    });
}

async function main() {
    console.log("Starting Manual Review...");

    if (!fs.existsSync(FAILURES_DIR)) {
        console.log("No failures directory found.");
        rl.close();
        return;
    }

    const files = fs.readdirSync(FAILURES_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

    if (files.length === 0) {
        console.log("No failed images to review! Great job.");
        rl.close();
        return;
    }

    console.log(`Found ${files.length} images to review.`);

    for (const file of files) {
        const filePath = path.join(FAILURES_DIR, file);
        console.log(`\nReviewing: ${file}`);
        openImage(filePath);

        const priceInput = await askQuestion("Enter Price (e.g. 25,00) or 's' to skip: ");
        if (priceInput.toLowerCase() === 's') continue;

        const dateInput = await askQuestion("Enter Date (DD/MM/YYYY) or ENTER to skip date check: ");

        console.log("Checking spreadsheet...");
        // Pass empty string as ocrText since we are doing manual entry
        const result = await checkAndUpdateRow(priceInput, dateInput, "");

        console.log(`Result: ${result.status} - ${result.message}`);

        if (result.status === 'MATCH' || result.status === 'ALREADY_VERIFIED') {
            console.log("Success! Moving image...");
            moveImage(filePath, 'success');
        } else {
            console.log("Still refused. Leaving in failures.");
        }
    }

    console.log("\nReview Complete.");
    rl.close();
}

main();
