const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function akilliAnaliz(metin) {
    const satirlar = metin.split('\n');
    let data = { dak: 0, sH: 0, sA: 0, sutH: 0, sutA: 0, korH: 0, korA: 0, xGH: 0, xGA: 0 };

    // Metin içindeki anahtar kelimelerden sayıları çekme
    satirlar.forEach(satir => {
        const s = satir.toLowerCase();
        const sayilar = satir.match(/\d+(\.\d+)?/g)?.map(Number) || [];

        if (s.includes('korner') || s.includes('köşe')) { data.korH = sayilar[0] || 0; data.korA = sayilar[1] || 0; }
        else if (s.includes('şut') || s.includes('vuruş')) { data.sutH = sayilar[0] || 0; data.sutA = sayilar[1] || 0; }
        else if (s.includes('beklenen gol') || s.includes('xg')) { data.xGH = sayilar[0] || 0; data.xGA = sayilar[1] || 0; }
        else if (s.includes('skor') || sayilar.length === 2 && s.includes('-')) { data.sH = sayilar[0]; data.sA = sayilar[1]; }
        // İlk satırda genellikle dakika yazar
        if (sayilar.length === 1 && data.dak === 0) data.dak = sayilar[0];
    });

    const tXG = (data.xGH + data.xGA).toFixed(2);
    const fark = data.sH - data.sA;

    let rapor = `🛡️ *KOPRADAR AKILLI ANALİZ*\n\n`;
    rapor += `🕒 Dakika: ${data.dak}'  🏟️ Skor: ${data.sH}-${data.sA}\n`;
    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

    if (fark < 0 && data.xGH > 0.8) {
        rapor += `🔥 *BASKI VAR:* Ev sahibi geride ama xG yükseliyor. Gol kovalıyorlar!\n\n`;
    } else if (tXG > 1.5) {
        rapor += `⚽ *GOL SİNYALİ:* Toplam xG (${tXG}) çok yüksek. Maçta tempo artacak.\n\n`;
    } else {
        rapor += `⌛ *KONTROLLÜ OYUN:* İstatistikler stabil, büyük bir risk görünmüyor.\n\n`;
    }

    rapor += `🚩 Korner: ${data.korH}-${data.korA} | 🥅 Şut: ${data.sutH}-${data.sutA}\n`;
    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    rapor += `💡 _Sadece kopyalayıp yapıştırdın, ben her şeyi yerli yerine koydum!_`;

    return rapor;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, akilliAnaliz(msg.text), { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v19 Active'); }).listen(process.env.PORT || 8080);
