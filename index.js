const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('photo', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    bot.sendMessage(msg.chat.id, "🔍 Resim ulaştı. OCR Motoru başlatılıyor...");

    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileLink = await bot.getFileLink(fileId);
        bot.sendMessage(msg.chat.id, "📥 Resim indirildi, karakterler taranıyor (Bu işlem 20sn sürebilir)...");

        const result = await Tesseract.recognize(fileLink, 'eng', {
            logger: m => console.log(m) // Render loglarında ilerlemeyi gör
        });
        
        const text = result.data.text;
        const sayilar = text.match(/\d+(\.\d+)?/g);

        if (!sayilar || sayilar.length < 5) {
            return bot.sendMessage(msg.chat.id, "❌ Resimdeki sayılar net okunamadı. Lütfen ekran görüntüsünün daha net ve kırpılmamış olduğundan emin olun.\n\nOkunan metin:\n" + text.substring(0, 100));
        }

        // Sayıları eşleştir
        const d = sayilar.map(Number);
        const rapor = `📊 *TARAMA BAŞARILI*\n\n` +
                     `🕒 Dakika: ${d[0]}\n` +
                     `⚽ Şutlar: ${d[1]} - ${d[2]}\n` +
                     `🚩 Korner: ${d[3]} - ${d[4]}\n` +
                     `🟨 Kart: ${d[5] || 0} - ${d[6] || 0}\n\n` +
                     `💡 Analiz motoru çalışıyor...`;
        
        bot.sendMessage(msg.chat.id, rapor, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ KRİTİK HATA: Sunucu Tesseract kütüphanesini çalıştıramadı. Hata: " + e.message);
    }
});

// Manuel girişi her ihtimale karşı açık tutuyoruz
bot.on('message', (msg) => {
    if (msg.photo || msg.text?.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, "🎯 Resim okuma başarısız olursa, istatistikleri buraya yazarak da analiz alabilirsiniz.");
});

http.createServer((req, res) => { res.end('Debug Active'); }).listen(process.env.PORT || 8080);
