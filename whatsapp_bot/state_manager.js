const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'reports', 'processed_state.json');

// Ensure reports dir exists
if (!fs.existsSync(path.dirname(STATE_FILE))) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
}

function loadState() {
    if (!fs.existsSync(STATE_FILE)) {
        return { processed_ids: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
        console.error("Error loading state:", e);
        return { processed_ids: [] };
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const state = loadState();
// Set for O(1) lookups
const processedSet = new Set(state.processed_ids);

function isProcessed(messageId) {
    return processedSet.has(messageId);
}

function markProcessed(messageId) {
    if (!messageId) return;
    processedSet.add(messageId);
    state.processed_ids = Array.from(processedSet);
    saveState(state);
}

module.exports = {
    isProcessed,
    markProcessed
};
