const { GoogleGenerativeAI } = require("@google/generative-ai");
const { callHuggingFaceOCR } = require('./hugging_face_service');
require('dotenv').config();

// Load keys from Environment Variables
const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
].filter(k => k && k.length > 20);

if (API_KEYS.length === 0) {
    console.warn("⚠️ No Valid Gemini API Keys found in .env!");
}

const UNIQUE_KEYS = [...new Set(API_KEYS)]; // Deduplicate
let currentKeyIndex = 0;

function getClient() {
    if (UNIQUE_KEYS.length === 0) return null;
    const key = UNIQUE_KEYS[currentKeyIndex];
    console.log(`[OCR] Using Key Index: ${currentKeyIndex} (Ends in ...${key.slice(-4)})`);
    return new GoogleGenerativeAI(key);
}

function rotateKey() {
    if (UNIQUE_KEYS.length === 0) return;
    currentKeyIndex = (currentKeyIndex + 1) % UNIQUE_KEYS.length;
    console.log(`[OCR] ⚠️ Rotating API Code. New Index: ${currentKeyIndex}`);
}

/**
 * Performs OCR and Information Extraction
 * Primary: Google Gemini
 * Fallback: Hugging Face
 * @param {Buffer} buffer 
 */
async function extractTextFromImage(buffer) {
    // 1. Try Google Gemini with Key Rotation
    try {
        if (UNIQUE_KEYS.length > 0) {
            const resultWithGemini = await tryGemini(buffer);
            if (resultWithGemini) return resultWithGemini;
        }
    } catch (e) {
        console.error("Gemini All Retries Failed:", e.message);
    }

    // 2. Fallback to Hugging Face
    console.log("[OCR] 🔄 Switching to Hugging Face Fallback...");
    try {
        const hfText = await callHuggingFaceOCR(buffer);
        if (hfText) {
            console.log("[OCR] Hugging Face Result:", hfText);
            // Since HF text is raw, we might try to extract price via Regex
            // (Simpler than Gemini's structured output, but better than nothing)
            return parseSimpleText(hfText);
        }
    } catch (e) {
        console.error("Hugging Face Failed:", e.message);
    }

    return null;
}

async function tryGemini(buffer) {
    const generateWithModel = async (modelName) => {
        const genAI = getClient();
        if (!genAI) throw new Error("No Gemini Client");

        console.log(`Sending image to Gemini Vision (Model: ${modelName})...`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `
        Analyze this receipt image. Extract:
        1. All monetary values (prices) associated with payments or totals. Ignore subtotals if Total is present.
        2. The date of the transaction (DD/MM/YYYY).
        
        Return ONLY a JSON object:
        {
            "prices": ["10.50", "100.00"],
            "dates": ["12/05/2026"],
            "rawText": "summary text"
        }
        Format prices as "0.00".
        `;

        const imagePart = {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: "image/jpeg"
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text();
    };

    let retries = 0;
    const MAX_ROTATIONS = UNIQUE_KEYS.length + 1;

    while (retries < MAX_ROTATIONS) {
        try {
            const text = await generateWithModel("gemini-1.5-flash"); // or 2.0-flash
            return parseGeminiResponse(text);
        } catch (err) {
            const msg = err.message || "";
            if (msg.includes("429") || msg.includes("quota")) {
                console.warn(`[OCR] Quota Exceeded on key ${currentKeyIndex}.`);
                rotateKey();
                retries++;
            } else {
                console.warn(`Gemini Error: ${msg}`);
                rotateKey(); // Rotate anyway just in case
                retries++;
            }
        }
    }
    return null;
}

function parseGeminiResponse(text) {
    if (!text) return null;
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        const data = JSON.parse(jsonStr);
        return {
            prices: data.prices || [],
            dates: data.dates || [],
            rawText: data.rawText || "Gemini Extraction"
        };
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return { prices: [], dates: [], rawText: text };
    }
}

/**
 * Poor man's extraction for raw text (Fallback)
 */
function parseSimpleText(text) {
    // Try to find prices like 10.00 or 10,00
    const priceRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/g;
    const dateRegex = /\b\d{2}\/\d{2}\/\d{4}\b/g;

    const prices = text.match(priceRegex) || [];
    const dates = text.match(dateRegex) || [];

    return {
        prices: prices,
        dates: dates,
        rawText: text
    };
}

module.exports = {
    extractTextFromImage
};
