const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const content = "GEMINI_API_KEY=AIzaSyBNU_Eu4ChAKOhqyrDO2qDLp16ffqdezyg";

try {
    fs.writeFileSync(envPath, content, { encoding: 'utf8' });
    console.log("Successfully wrote .env file to:", envPath);
    console.log("Verification:", fs.existsSync(envPath) ? "EXISTS" : "MISSING");
} catch (e) {
    console.error("Failed to write .env:", e);
}
