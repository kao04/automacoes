const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'reports', 'log.json');
const IMAGES_DIR = path.join(__dirname, 'reports', 'images');

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Helper to append to log file
function appendLog(entry) {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            const data = fs.readFileSync(LOG_FILE, 'utf8');
            logs = JSON.parse(data);
        } catch (err) {
            console.error('Error reading log file, starting new one:', err);
        }
    }

    // Add timestamp to entry
    entry.timestamp = new Date().toISOString();
    logs.push(entry);

    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error('Error writing to log file:', err);
    }
}

/**
 * Saves a media buffer to the reports/images folder
 * @param {Buffer} buffer - Image data
 * @param {string} sender - Sender identifier (phone number)
 * @param {string} dateStr - Date string or timestamp
 * @param {string} status - 'success' or 'failure' (optional, maps to subfolder)
 * @returns {string} - Relative path to the saved image
 */
function saveImage(buffer, sender, dateStr, status = 'pending') {
    // Sanitize filename
    const sanitizedSender = sender.replace(/[^a-z0-9]/gi, '_');
    const filename = `${dateStr}_${sanitizedSender}.jpg`;

    // Determine subfolder
    let subfolder = '';
    if (status === 'success') subfolder = 'success';
    else if (status === 'failure') subfolder = 'failures';
    else subfolder = 'pending'; // Initial state

    const targetDir = path.join(IMAGES_DIR, subfolder);

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const filepath = path.join(targetDir, filename);

    try {
        fs.writeFileSync(filepath, buffer);
        console.log(`Image saved to ${filepath}`);
        return filepath;
    } catch (err) {
        console.error('Error saving image:', err);
        return null;
    }
}

/**
 * Moves an image from pending/failures to success (or vice versa)
 * @param {string} currentPath 
 * @param {string} targetStatus 'success' | 'failure'
 */
function moveImage(currentPath, targetStatus) {
    if (!currentPath || !fs.existsSync(currentPath)) return null;

    const filename = path.basename(currentPath);
    const targetDir = path.join(IMAGES_DIR, targetStatus === 'success' ? 'success' : 'failures');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const newPath = path.join(targetDir, filename);

    try {
        fs.renameSync(currentPath, newPath);
        console.log(`Moved image to ${newPath}`);
        return newPath;
    } catch (err) {
        console.error("Error moving image:", err);
        return currentPath;
    }
}

/**
 * Logs a check action
 * @param {object} actionData 
 */
function logAction(actionData) {
    /* 
    Expected structure:
    {
        sender: string,
        extractedPrice: string,
        sheetPrice: string,
        status: 'MATCH' | 'MISMATCH' | 'ERROR',
        details: string,
        imagePath: string
    }
    */
    appendLog(actionData);
    console.log(`[REPORT] ${actionData.status}: ${actionData.details}`);
}

module.exports = {
    saveImage,
    moveImage,
    logAction
};
