require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API Key found in .env");
    process.exit(1);
}

async function checkModels() {
    console.log(`Checking models for key ending in ...${apiKey.slice(-5)}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API RETURNED ERROR:");
            console.error(JSON.stringify(data.error, null, 2));
            return;
        }

        if (data.models) {
            console.log("\n✅ API KEY IS VALID! Available Models:");
            const visions = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
            visions.forEach(m => {
                console.log(`- ${m.name.replace('models/', '')} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("Response OK but no models list?", data);
        }
    } catch (e) {
        console.error("Network/Fetch Error:", e);
    }
}

checkModels();
