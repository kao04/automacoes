const fetch = require('node-fetch');
require('dotenv').config();

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
// Models optimized for printed text / receipts
const MODEL_URL = "https://api-inference.huggingface.co/models/microsoft/trocr-base-printed";

/**
 * Calls Hugging Face Inference API to extracting text from image
 * @param {Buffer} imageBuffer 
 * @returns {Promise<string>} Raw text extracted
 */
async function callHuggingFaceOCR(imageBuffer) {
    if (!HF_API_KEY) {
        console.warn("[HF] No API Key found. Skipping.");
        return null;
    }

    try {
        console.log(`[HF] Sending image to ${MODEL_URL}...`);
        const response = await fetch(MODEL_URL, {
            headers: {
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/octet-stream",
            },
            body: imageBuffer,
            method: "POST",
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HF API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        // Result is usually an array of objects: [{ generated_text: "..." }]
        if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
            console.log("[HF] Success! Text extracted.");
            return result[0].generated_text;
        }

        return JSON.stringify(result);

    } catch (error) {
        console.error("[HF] OCR Failed:", error.message);
        return null;
    }
}

module.exports = { callHuggingFaceOCR };
