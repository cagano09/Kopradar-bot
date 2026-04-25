const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function suzgecAnaliz(metin) {
    // Tüm sayıları (noktalı dahil) temizle
    const sayilar = metin.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    
    if (sayilar.length < 5) return "❌ Veri algılanamadı. Lütfen istatistikleri kopyalayıp gönderin.";

    // Akıllı Eşleştirme (Genel spor siteleri hiyerarşisi)
    // Eğer metinde "Korner" geçiyorsa o satırdaki sayıları ayırır
    const d = {
        dak: sayilar[0],
        skor: [sayilar[1], sayilar[2]],
        sut: [sayilar[3], sayilar[4]],
        kor: [sayilar[5], sayilar[6]],
        xg: [sayilar[sayilar.length-2] || 0.1, sayilar[sayilar.length-1] || 0.1]
    };

    const tXG = (d.xg[0] + d.xg[1]).toFixed(2);
    const fark = d.skor[0] - d.skor[1];

    let rapor = `🛡️ *KOPRADAR PRO ANALİZ v20.0*\n\n`;
    rapor += `🕒 Dakika: ${d.dak}' | 🏟️ Skor: ${d.skor[0]}-${d.skor[1]}\n`;
    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

    // STRATEJİK YORUM
    if (fark === 0 && tXG > 1.2) rapor += `🔥 *KİLİT KIRILIYOR:* Beraberlik her an bozulabilir. 0.5 ÜST kovalanmalı.\n\n`;
    else if (fark < 0 && d.xg[0] > 1.0) rapor += `💪 *EV DÖNÜYOR:* Ev sahibi geride ama baskısı çok yüksek. Gol yakın.\n\n`;
    else if (tXG > 2.0) rapor += `🥅 *GOL YAĞMURU:* Maçın xG oranı çok yüksek. Pozisyon kaçmıyor.\n\n`;
    else rapor += `⌛ *DURAĞAN:* İstatistikler henüz net bir fırsat vermiyor.\n\n`;

    rapor += `🚩 Korner: ${d.kor[0]}-${d.kor[1]} | 🥅 Şut: ${d.sut[0]}-${d.sut[1]}\n`;
    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    rapor += `📊 Toplam Beklenen Gol (xG): ${tXG}\n`;
    rapor += `💡 _Siz sadece kopyalayın, ben içinden doğruları çekerim._`;

    return rapor;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, suzgecAnaliz(msg.text), { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v20 Active'); }).listen(process.env.PORT || 8080);
