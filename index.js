const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function akilliSüzgeç(metin) {
    const sayilar = metin.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (sayilar.length < 5) return "❌ Veri okunamadı. Lütfen istatistikleri seçip paylaşın.";

    // Veri Haritası: Dakika, Skor, xG, Şut, Korner
    const d = {
        dak: sayilar[0] || 0,
        sH: sayilar[1] || 0, sA: sayilar[2] || 0,
        xGH: sayilar[3] || 0.1, xGA: sayilar[4] || 0.1,
        korH: sayilar[sayilar.length - 2] || 0, korA: sayilar[sayilar.length - 1] || 0
    };

    const tXG = (d.xGH + d.xGA).toFixed(2);
    let mesaj = `🛡️ *KOPRADAR ANALİZ v23.0*\n\n`;
    mesaj += `🕒 Dakika: ${d.dak}' | 🏟️ Skor: ${d.sH}-${d.sA}\n`;
    mesaj += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

    if (tXG > 1.5) mesaj += `⚽ *GOL SİNYALİ:* Toplam xG (${tXG}) çok yüksek. Maç hareketli!\n\n`;
    else if (d.sH < d.sA && d.xGH > 0.8) mesaj += `🔥 *BASKI EVDE:* Ev sahibi geride ama ciddi bastırıyor.\n\n`;
    else mesaj += `⌛ *DENGELİ:* Oyun şu an stabil görünüyor.\n\n`;

    mesaj += `🚩 Korner: ${d.korH}-${d.korA} | 📊 xG: ${tXG}\n`;
    return mesaj;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, akilliSüzgeç(decodeURIComponent(msg.text)), { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('Kestirme Hazır'); }).listen(process.env.PORT || 8080);
