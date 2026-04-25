const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

async function gizliİnsanModuOku(url) {
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();

    try {
        // 1. Botu gerçek bir iPhone Safari gibi tanıtıyoruz
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');

        // 2. "Ben bir otomasyonum" izini siliyoruz
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // 3. Reklamları ve Pop-up'ları Silen "Temizlik" Kodu
        await page.evaluate(() => {
            const reklamlar = document.querySelectorAll('iframe, .ads, .reklam, #pop-up, [id*="google_ads"], [class*="reklam"]');
            reklamlar.forEach(el => el.remove());
        });

        // 4. İnsan gibi davran: 3 saniye bekle ve sayfayı kaydır
        await new Promise(r => setTimeout(r, 3000));
        await page.mouse.wheel({ deltaY: 500 });

        // 5. Maç verilerini çek
        const sayfaVerisi = await page.evaluate(() => document.body.innerText);
        
        await browser.close();

        // Sayıları ayıkla (Dakika, Skor, xG)
        const s = sayfaVerisi.match(/\d+(\.\d+)?/g)?.map(Number) || [];
        
        if (s.length < 3) return "⚠️ Siteye gizlice girdim ama veriler hala kilitli görünüyor.";

        const dak = s.find(n => n > 0 && n < 105) || "??";
        const xGler = s.filter(n => n > 0 && n < 6 && n.toString().includes('.'));
        const tXG = ( (xGler[0] || 0) + (xGler[1] || 0) ).toFixed(2);

        let rapor = `🛡️ *KOPRADAR GİZLİ TARAMA v43*\n\n`;
        rapor += `🕒 Dakika: ${dak}' | 📊 Toplam xG: ${tXG}\n`;
        rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        rapor += tXG > 1.3 ? "🔥 *ALARM:* Baskı çok yüksek!" : "⌛ *TAKİP:* Maç sakin devam ediyor.";

        return rapor;

    } catch (e) {
        await browser.close();
        return "❌ Güvenlik duvarı aşılamadı veya bağlantı çok yavaş.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || !msg.text.includes('http')) return;
    
    bot.sendMessage(MY_CHAT_ID, "🎭 Gizli modda siteye giriliyor, reklamlar temizleniyor...");
    const sonuc = await gizliİnsanModuOku(msg.text);
    bot.sendMessage(MY_CHAT_ID, sonuc, { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar Stealth Mode Active'); }).listen(process.env.PORT || 8080);
