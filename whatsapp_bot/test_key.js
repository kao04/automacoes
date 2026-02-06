require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = process.env.GEMINI_API_KEY;

console.log("--- DEBUGGER ---");
console.log("CWD:", process.cwd());
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
console.log(".env Path:", envPath);
console.log("Exists:", fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
    console.log("Content:", fs.readFileSync(envPath, 'utf8'));
}

if (!key) {
    console.error("ERROR: No API Key found in .env (via dotenv)");
    // Try manual parse
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/GEMINI_API_KEY=(.*)/);
        if (match) {
            console.log("MANUAL PARSE SUCCESS:", match[1].trim());
            process.env.GEMINI_API_KEY = match[1].trim(); // FORCE IT
        }
    }
} else {
    console.log(`Key Found! Length: ${key.length}`);
    console.log(`Starts with: '${key.substring(0, 5)}...'`);
    console.log(`Ends with: '...${key.substring(key.length - 5)}'`);

    // Check for whitespace
    if (key.trim() !== key) {
        console.error("WARNING: API Key has surrounding whitespace! fixing...");
    }

    // List Models
    async function listModels() {
        const genAI = new GoogleGenerativeAI(key.trim());

        // 1. Try gemini-1.5-flash
        try {
            console.log("\nTrying gemini-1.5-flash...");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Hello");
            console.log("SUCCESS: gemini-1.5-flash worked!");
        } catch (e) {
            console.error("FAIL: gemini-1.5-flash full error:", e);
        }

        // 2. Try gemini-pro (Text only checks key validity)
        try {
            console.log("\nTrying gemini-pro (text only)...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("Hello");
            console.log("SUCCESS: gemini-pro worked!");
        } catch (e) {
            console.error("FAIL: gemini-pro full error:", e);
        }

        // 3. Try gemini-pro-vision
        try {
            console.log("\nTrying gemini-pro-vision...");
            const model3 = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            const result3 = await model3.generateContent("Hello");
            console.log("SUCCESS: gemini-pro-vision worked!");
        } catch (e) {
            console.error("FAIL: gemini-pro-vision full error:", e);
        }
    }
    listModels();
}
