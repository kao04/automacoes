const fs = require('fs');

const historyFile = './history.json';

if (fs.existsSync(historyFile)) {
    try {
        const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        console.log(`\nTotal Users Processed: ${history.length}\n`);
        console.table(history);
    } catch (e) {
        console.error('Error reading history file:', e);
    }
} else {
    console.log('No history file found yet (bot hasn\'t processed anyone).');
}
