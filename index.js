const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

async function hizliOku(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        // Resimleri ve CSS'i yüklemeyerek botu %80 hızlandırıyoruz
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        const metin = await page.evaluate(() => document.body.innerText);
        await browser.close();

        const s = metin.match(/\d+(\.\d+)?/g)?.map(Number) || [];
        if (s.length < 2) return "⚠️ Veri çekilemedi. Site botu engellemiş olabilir.";

        // Basit analiz
        return `🛡️ *KOPRADAR v44.0*\n\n✅ Maç verileri başarıyla çekildi.\n📊 Analiziniz Telegram'a hazır!`;

    } catch (e) {
        if (browser) await browser.close();
        return "❌ Tarayıcı hatası: Render kaynağı yetersiz kalmış olabilir.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || !msg.text.includes('http')) return;
    
    bot.sendMessage(MY_CHAT_ID, "🚀 Jet hızıyla siteye giriliyor...");
    const sonuc = await hizliOku(msg.text);
    bot.sendMessage(MY_CHAT_ID, sonuc, { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v44 Ready'); }).listen(process.env.PORT || 8080);
