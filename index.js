const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

// Analiz Motoru
function analizEt(metin) {
    const sayilar = metin.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (sayilar.length < 3) return "⚠️ Yeterli veri bulunamadı.";

    const dak = sayilar.find(n => n > 0 && n < 105) || "??";
    const xGler = sayilar.filter(n => n > 0 && n < 6 && n.toString().includes('.'));
    const tXG = ( (xGler[0] || 0) + (xGler[1] || 0) ).toFixed(2);

    let r = `🛡️ *KOPRADAR v50 (GÖRSEL/METİN)*\n\n`;
    r += `🕒 Dakika: ${dak}' | 📈 Toplam xG: ${tXG}\n`;
    r += `〰️〰️〰️〰️〰️〰️〰️\n`;
    r += tXG > 1.2 ? "🔥 *GOL SİNYALİ:* Baskı yüksek!" : "⌛ *BEKLEMEDE:* Tempo düşük.";
    return r;
}

// Resim Geldiğinde Çalışacak Kısım
bot.on('photo', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "📸 Resim alındı, " + (msg.caption || "maç") + " verileri okunuyor...");

    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);

        // OCR ile resimdeki yazıları oku
        const { data: { text } } = await Tesseract.recognize(fileUrl, 'eng');
        const sonuc = analizEt(text);
        bot.sendMessage(chatId, sonuc, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(chatId, "❌ Resim okunurken bir hata oluştu.");
    }
});

// Metin Geldiğinde Çalışacak Kısım
bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.photo) return;
    
    const metin = msg.text || "";
    if (metin.length > 3) {
        bot.sendMessage(MY_CHAT_ID, "🔍 Metin üzerinden analiz yapılıyor...");
        const sonuc = analizEt(metin);
        bot.sendMessage(MY_CHAT_ID, sonuc, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar v50 Ready'); }).listen(process.env.PORT || 8080);
