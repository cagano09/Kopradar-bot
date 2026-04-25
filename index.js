const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;

    try {
        const temizMetin = decodeURIComponent(msg.text);
        const s = temizMetin.match(/\d+(\.\d+)?/g)?.map(Number) || [];

        if (s.length < 4) return bot.sendMessage(msg.chat.id, "⚠️ Veri tam gelmedi, lütfen istatistikleri daha geniş seçin.");

        const dak = s[0], sH = s[1], sA = s[2];
        const xGler = s.filter(n => n > 0 && n < 5 && n.toString().includes('.'));
        const xGH = xGler[0] || 0.1, xGA = xGler[1] || 0.1;
        const tXG = (xGH + xGA).toFixed(2);

        let r = `🛡️ *KOPRADAR CANLI ANALİZ v26.0*\n\n`;
        r += `🕒 Dakika: ${dak}' | 🏟️ Skor: ${sH}-${sA}\n`;
        r += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

        if (tXG > 1.3) r += `🔥 *TEHLİKE:* Toplam xG (${tXG}) yüksek! Gol kokusu var.\n\n`;
        else if (sH < sA && xGH > 0.7) r += `💪 *EV BASKISI:* Ev sahibi skoru değiştirmek için yükleniyor.\n\n`;
        else r += `⌛ *KONTROLLÜ:* Maç şu an dengeli bir tempoda.\n\n`;

        r += `📊 Toplam Beklenen Gol (xG): ${tXG}\n`;
        bot.sendMessage(msg.chat.id, r, { parse_mode: "Markdown" });
    } catch (e) {
        console.error(e);
    }
});

http.createServer((req, res) => { res.end('KopRadar Shortcuts v26 Live'); }).listen(process.env.PORT || 8080);
