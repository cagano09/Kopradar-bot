const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    const metin = msg.text || "";
    // Sayıları ayıkla
    const s = metin.match(/\d+(\.\d+)?/g)?.map(Number) || [];

    if (s.length < 3) {
        return bot.sendMessage(MY_CHAT_ID, "📊 *KOPRADAR:* Veri alındı ancak içinde analiz edilecek sayı bulunamadı. Lütfen istatistik panelini seçerek paylaşın.");
    }

    // Akıllı Eşleştirme
    const dak = s[0];
    const sH = s[1], sA = s[2];
    const xGler = s.filter(n => n.toString().includes('.') && n < 6);
    const xGH = xGler[0] || 0.0, xGA = xGler[1] || 0.0;
    const tXG = (xGH + xGA).toFixed(2);

    let rapor = `🛡️ *KOPRADAR PRO v31.0*\n\n`;
    rapor += `🕒 Dakika: ${dak}' | 🏟️ Skor: ${sH}-${sA}\n`;
    rapor += `📊 Toplam xG: ${tXG} (E:${xGH} / D:${xGA})\n`;
    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

    if (tXG > 1.4) rapor += `⚽ *TEHLİKE:* Gol beklentisi çok yüksek, tempo artıyor!\n`;
    else if (sH === sA && tXG > 0.8) rapor += `🔥 *KİLİT:* Eşitlik bozulmak üzere, baskı yoğun.\n`;
    else rapor += `⌛ *KONTROLLÜ:* Takımlar şu an dengeli oynuyor.\n`;

    bot.sendMessage(MY_CHAT_ID, rapor, { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v31 Ready'); }).listen(process.env.PORT || 8080);
