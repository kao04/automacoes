require('dotenv').config();
const puppeteer = require('puppeteer');
const { getRandomMessage } = require('./messages');
const fs = require('fs');

const CONFIG = {
    baseUrl: 'https://www.instagram.com',
    targetProfiles: [
        'conselhosparacasais',
        'casais.apaixonados',
        'namoro.cristao',
        'vida.de.casal'
    ],
    messagesPerDay: 40,
    delayBetweenActions: { min: 15000, max: 25000 },
    historyFile: './history.json'
};

function loadHistory() {
    try {
        if (fs.existsSync(CONFIG.historyFile)) {
            return JSON.parse(fs.readFileSync(CONFIG.historyFile, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading history:', e);
    }
    return [];
}

function saveHistory(history) {
    try {
        fs.writeFileSync(CONFIG.historyFile, JSON.stringify(history, null, 2));
    } catch (e) {
        console.error('Error saving history:', e);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    console.log(`Waiting for ${delay / 1000} seconds...`);
    return sleep(delay);
}

async function main() {
    console.log('Starting Instagram Bot (Custom Browser Mode)...');

    // Attempt to locate Brave or Edge
    const browserPaths = [
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Users\\" + process.env.USERNAME + "\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
    ];

    let executablePath = null;
    for (const p of browserPaths) {
        if (fs.existsSync(p)) {
            executablePath = p;
            console.log(`Found custom browser: ${p}`);
            break;
        }
    }

    if (!executablePath) {
        console.log('No custom browser found. Using bundled Chromium.');
    }

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: executablePath || undefined,
        defaultViewport: null,
        args: ['--start-maximized', '--disable-notifications', '--no-sandbox']
    });

    const page = await browser.newPage();

    // --- MANUAL LOGIN ---
    try {
        console.log('Navigating to login...');
        await page.goto(`${CONFIG.baseUrl}/accounts/login/`, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('\n=== MANUAL LOGIN REQUIRED ===');
        console.log('Please log in manually in the browser window.');
        console.log('The bot will resume automatically when it detects the Home Feed.');
        console.log('Waiting...');

        // Wait indefinitely for Home/Search icon
        await page.waitForSelector('svg[aria-label="Search"], svg[aria-label="Pesquisa"], svg[aria-label="Home"], svg[aria-label="Página inicial"]', { timeout: 0 });

        console.log('Login Detected! Resuming...');
        await randomDelay(3000, 5000);

        // Popups (Save Info / Notifications)
        const popups = [
            "//div[contains(text(), 'Not Now')]", "//div[contains(text(), 'Agora não')]",
            "//button[contains(text(), 'Not Now')]", "//button[contains(text(), 'Agora não')]"
        ];
        for (const p of popups) {
            try {
                const [btn] = await page.$x(p);
                if (btn) { await btn.click(); await randomDelay(1000, 2000); }
            } catch (e) { }
        }

        await processTargets(page);

    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

async function processTargets(page) {
    const history = loadHistory();
    console.log(`Loaded ${history.length} users from history.`);

    let totalActionsThisRun = 0;
    const MAX_ACTIONS_PER_RUN = 20;

    for (const targetProfile of CONFIG.targetProfiles) {
        if (totalActionsThisRun >= MAX_ACTIONS_PER_RUN) {
            console.log('Global limit of 20 actions reached. Stopping.');
            break;
        }

        console.log(`\n=== SOURCE: ${targetProfile} ===`);

        try {
            await page.goto(`${CONFIG.baseUrl}/${targetProfile}/`, { waitUntil: 'networkidle2' });
            await randomDelay(2000, 4000);

            // Followers List
            const followersLinkSelector = `a[href*="/${targetProfile}/followers/"]`;
            try {
                await page.waitForSelector(followersLinkSelector, { timeout: 10000 });
                await page.click(followersLinkSelector);
            } catch (e) {
                console.log(`Cannot open followers for ${targetProfile}. Skipping.`);
                continue;
            }

            await randomDelay(3000, 5000);

            // Scroll
            const dialogSelector = 'div[role="dialog"]';
            try {
                await page.waitForSelector(dialogSelector, { timeout: 10000 });
                // Attempt simple scroll
                const dialog = await page.$(dialogSelector);
                await page.evaluate((d) => {
                    const scrollables = Array.from(d.querySelectorAll('*')).filter(el => {
                        const s = window.getComputedStyle(el);
                        return s.overflowY === 'auto' || s.overflowY === 'scroll';
                    });
                    if (scrollables.length) scrollables[0].scrollTop = scrollables[0].scrollHeight;
                }, dialog);
                await randomDelay(2000, 3000);
            } catch (e) {
                console.log('Scrolling issue:', e.message);
            }

            // Extract
            const usernames = await page.evaluate((tp) => {
                const dialog = document.querySelector('div[role="dialog"]');
                if (!dialog) return [];
                const links = Array.from(dialog.querySelectorAll('a'));
                return links
                    .map(link => link.getAttribute('href'))
                    .filter(href => href && href !== '#' && href !== '/' && !href.includes(tp))
                    .map(href => href.replace(/\//g, ''));
            }, targetProfile);

            const uniqueUsers = [...new Set(usernames)];
            console.log(`Potential targets: ${uniqueUsers.length}`);

            for (const user of uniqueUsers) {
                if (totalActionsThisRun >= MAX_ACTIONS_PER_RUN) break;

                console.log(`\n> User: ${user}`);

                // HISTORY RE-CHECK
                if (history.some(h => h.user === user)) {
                    console.log(`  - Already in history.`);
                    continue;
                }

                try {
                    await page.goto(`${CONFIG.baseUrl}/${user}/`, { waitUntil: 'networkidle2' });
                    await randomDelay(3000, 5000);

                    // PRIVACY
                    const isPrivate = await page.evaluate(() => {
                        const txt = document.body.innerText.toLowerCase();
                        return txt.includes('this account is private') ||
                            txt.includes('esta conta é privada') ||
                            txt.includes('este perfil é privado');
                    });

                    if (isPrivate) {
                        console.log(`  - Private Account. Skipping.`);
                        continue;
                    }

                    // FOLLOW
                    let followed = false;
                    const followVariations = ["Follow", "Seguir", "Follow Back", "Seguir de volta"];
                    const buttons = await page.$$('button');
                    let followBtn = null;

                    for (const btn of buttons) {
                        const text = await (await btn.getProperty('textContent')).jsonValue();
                        if (followVariations.includes(text)) {
                            followBtn = btn;
                            break;
                        }
                    }

                    if (followBtn) {
                        console.log(`  - Clicking Follow...`);
                        await followBtn.click();
                        await randomDelay(2000, 4000);
                        followed = true;

                        // Log follow immediately
                        history.push({ user, source: targetProfile, action: 'followed', date: new Date().toISOString() });
                        saveHistory(history);
                    } else {
                        console.log(`  - Already following or button missing.`);
                    }

                    // SEMI-AUTOMATED MESSAGE LOGIC
                    console.log(`  - Waiting for USER to click 'Message' (Timeout: 60s)...`);

                    // Wait for chat input to appear (User clicks "Message" manually)
                    const inputSelectors = [
                        'textarea',
                        'div[contenteditable="true"]',
                        'div[role="textbox"]',
                        'div[aria-label="Message..."]',
                        'div[aria-label="Mensagem..."]',
                        'div[aria-label="Escreva uma mensagem..."]'
                    ];

                    let inputFound = false;
                    const t0 = Date.now();
                    const TIMEOUT_MS = 60000; // 60s Timeout

                    while (Date.now() - t0 < TIMEOUT_MS) {
                        for (const sel of inputSelectors) {
                            try {
                                const el = await page.$(sel);
                                if (el && await el.boundingBox()) { // check visibility
                                    inputFound = true;
                                    console.log('  - Chat detected! Sending message...');

                                    await page.click(sel);
                                    await randomDelay(500, 1000);

                                    const msg = getRandomMessage();
                                    await page.type(sel, msg, { delay: 50 });
                                    await randomDelay(1000, 2000);
                                    await page.keyboard.press('Enter');
                                    console.log(`  - Message Sent!`);
                                    break;
                                }
                            } catch (e) { }
                        }
                        if (inputFound) break;
                        await sleep(1000); // Check every second
                    }

                    if (inputFound) {
                        // Update log
                        const entry = history.find(h => h.user === user && h.action === 'followed');
                        if (entry) entry.action = 'followed_and_messaged';
                        else history.push({ user, source: targetProfile, action: 'messaged_only', date: new Date().toISOString() });
                        saveHistory(history);

                        if (!followed) totalActionsThisRun++;

                        await randomDelay(CONFIG.delayBetweenActions.min, CONFIG.delayBetweenActions.max);

                    } else {
                        console.log(`  - Timeout (60s) passed. Skipping user.`);
                        // If we followed but timed out on message, we still count the action
                        if (followed) totalActionsThisRun++;
                    }

                } catch (e) {
                    console.log(`  - Error: ${e.message}`);
                }
            }

        } catch (e) {
            console.error(`Error with source ${targetProfile}:`, e);
        }
    }
    console.log(`Done. Total actions executed: ${totalActionsThisRun}`);
}

main();
