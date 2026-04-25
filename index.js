const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;

    const d = msg.text.split(' ').map(Number);
    if (d.length < 5) return bot.sendMessage(msg.chat.id, "⚠️ Eksik veri geldi.");

    // Kestirmeden gelen sıralama: Dakika, SkorEv, SkorDep, KorH, KorA, SutH, SutA, xGH, xGA
    const [dak, sH, sA, korH, korA, sutH, sutA, xGH, xGA] = d;
    const tXG = (xGH + xGA).toFixed(2);

    let yorum = `🛡️ *KOPRADAR KESTİRME ANALİZ*\n\n`;
    yorum += `🕒 Dakika: ${dak}' | 🏟️ Skor: ${sH}-${sA}\n`;
    yorum += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    
    if (sH < sA && xGH > 1.0) yorum += `🔥 *BASKI EVDE:* Ev sahibi geride ama xG çok yüksek! Gol yaklaşıyor.\n\n`;
    else if (tXG > 1.5) yorum += `⚽ *GOL POTANSİYELİ:* Maçta xG tavan yaptı (${tXG}). Tempo çok yüksek.\n\n`;
    else yorum += `⌛ *DENGELİ:* İstatistikler şu an risk içermiyor.\n\n`;

    yorum += `🚩 Korner: ${korH}-${korA} | 🥅 Şut: ${sutH}-${sutA}\n`;
    yorum += `📊 Toplam xG: ${tXG}\n`;
    
    bot.sendMessage(msg.chat.id, yorum, { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar Shortcuts Ready'); }).listen(process.env.PORT || 8080);
