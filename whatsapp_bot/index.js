const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { logAction, saveImage, moveImage } = require('./logger');
const { extractTextFromImage } = require('./ocr_service');
const { checkAndUpdateRow } = require('./google_sheets_service');
require('dotenv').config();

// Initialize the client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Set to false if you need to see the browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR Code
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

const GROUP_NAME = 'Comprovantes Planilha';

// Helper to process a single message
async function processMessage(msg) {
    if (msg.hasMedia) {
        try {
            const media = await msg.downloadMedia();
            if (media.mimetype.startsWith('image/')) {
                console.log(`[${msg.from}] Image received in group, processing...`);

                // 1. Process image with OCR
                const imageBuffer = Buffer.from(media.data, 'base64');
                const ocrResult = await extractTextFromImage(imageBuffer);

                // 2. Save Image (Initially as pending/processing)
                const timestamp = msg.timestamp * 1000; // Msg timestamp is unix seconds
                const dateStr = new Date(timestamp).toISOString().split('T')[0];
                let savedPath = saveImage(imageBuffer, msg.from, dateStr, 'pending');


                // 3. Check Spreadsheet
                if (ocrResult && ocrResult.prices.length > 0) {
                    console.log('Extracted Data:', ocrResult);

                    const prices = ocrResult.prices; // Array
                    const date = ocrResult.dates.length > 0 ? ocrResult.dates[0] : null;

                    const sheetResult = await checkAndUpdateRow(prices, date, ocrResult.rawText);

                    // MOVE IMAGE BASED ON STATUS
                    if (sheetResult.status === 'MATCH' || sheetResult.status === 'ALREADY_VERIFIED') {
                        savedPath = moveImage(savedPath, 'success');
                    } else {
                        savedPath = moveImage(savedPath, 'failure');
                        // Create Metadata File
                        const metaPath = savedPath.replace('.jpg', '.txt');
                        const metaContent = `Prices: ${prices.join(', ')}\nDate: ${date}\nRaw:\n${ocrResult.rawText}`;
                        require('fs').writeFileSync(metaPath, metaContent);
                    }

                    logAction({
                        sender: msg.from,
                        extractedPrice: prices.join(' | '),
                        sheetPrice: "CHECKED",
                        status: sheetResult.status,
                        details: sheetResult.message,
                        imagePath: savedPath
                    });
                } else {
                    // NO PRICE FOUND -> FAILURE
                    savedPath = moveImage(savedPath, 'failure');
                    // Create Metadata File
                    const metaPath = savedPath.replace('.jpg', '.txt');
                    const metaContent = `No Prices Found.\nRaw:\n${ocrResult ? ocrResult.rawText : 'OCR Failed'}`;
                    require('fs').writeFileSync(metaPath, metaContent);

                    logAction({
                        sender: msg.from,
                        extractedPrice: "N/A",
                        sheetPrice: "N/A",
                        status: "OCR_FAIL",
                        details: "No price found",
                        imagePath: savedPath
                    });
                }
            }
        } catch (err) {
            console.error("Error processing message:", err);
        }
    }
}

// Client is ready
const { isProcessed, markProcessed } = require('./state_manager');

client.on('ready', async () => {
    console.log('Client is ready!');

    // Find Group
    const chats = await client.getChats();
    const group = chats.find(chat => chat.name === 'Comprovantes Planilha');

    if (group) {
        console.log(`Group "${group.name}" found! Fetching history...`);

        // Fetch Limit: increased to cover more ground, but state will filter dupes
        const messages = await group.fetchMessages({ limit: 500 });

        console.log(`Fetched ${messages.length} messages. Filtering and Sorting...`);

        // Sort Chronologically: Oldest First
        messages.sort((a, b) => a.timestamp - b.timestamp);

        for (const msg of messages) {
            if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
                // CHECK STATE FIRST
                if (isProcessed(msg.id.id)) {
                    console.log(`[SKIP] Msg ${msg.id.id} already processed.`);
                    continue;
                }

                console.log(`[${msg.id.id}] Processing new message from ${new Date(msg.timestamp * 1000).toISOString()}...`);
                await processMessage(msg);

                // Mark as processed regardless of outcome to avoid loop blocks?
                // Or only on success? User said "don't waste images".
                // If we mark it, we won't retry if it failed due to bug.
                // But if we don't, we will hit quota again on same image.
                // Best approach: Mark it. Errors are logged in failures folder for manual review.
                markProcessed(msg.id.id);
            }
        }
        console.log("History processing complete.");
    } else {
        console.log('Group "Comprovantes Planilha" not found.');
    }
});

// Message listener
client.on('message', async msg => {
    const chat = await msg.getChat();

    if (chat.isGroup && chat.name === GROUP_NAME) {
        console.log(`New message in ${GROUP_NAME}`);
        await processMessage(msg);
    } else {
        // Ignore other chats
        // console.log(`Ignored message from ${chat.name}`);
    }
});

client.initialize();
