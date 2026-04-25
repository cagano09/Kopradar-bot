const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function detayliAnaliz(metin) {
    const s = metin.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (s.length < 3) return "⚠️ Gelen veride yeterli sayı bulunamadı:\n\n" + metin;

    const dak = s[0], sH = s[1], sA = s[2];
    const xGler = s.filter(n => n > 0 && n < 6 && n.toString().includes('.'));
    const xGH = xGler[0] || 0.0, xGA = xGler[1] || 0.0;
    const tXG = (xGH + xGA).toFixed(2);

    let r = `🛡️ *KOPRADAR ANALİZ v26.0*\n\n`;
    r += `🕒 Dakika: ${dak}' | 🏟️ Skor: ${sH}-${sA}\n`;
    r += `📊 Toplam xG: ${tXG}\n`;
    r += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    
    if (tXG > 1.0) r += `🔥 *BASKI:* Maçta gol beklentisi artıyor.\n`;
    else r += `⌛ *DURAĞAN:* Pozisyonlar henüz net değil.\n`;

    return r;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    // Test amaçlı: Bot ne aldığını görsün
    console.log("Gelen Veri:", msg.text);
    
    const rapor = detayliAnaliz(msg.text);
    bot.sendMessage(msg.chat.id, rapor, { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v26 Active'); }).listen(process.env.PORT || 8080);
