const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const http = require('http');

// ================= AYARLAR =================
// Kendi Token ve ID bilgilerini buraya sabitledim
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

// ================= ANALİZ MOTORU =================
function detayliAnaliz(data) {
    const { dak, hSut, aSut, hKorner, aKorner, hSari, aSari, hXG, aXG, hTehAtak, aTehAtak } = data;

    const toplamSut = hSut + aSut;
    const toplamXG = (parseFloat(hXG) + parseFloat(aXG)).toFixed(2);
    const baskiGucu = ((hTehAtak + aTehAtak) / (dak || 1)).toFixed(2);

    // 1. GOL OLASILIĞI
    let golTahmin = "⌛ Sabırlı Olun: Oyun henüz kilitli.";
    if (toplamXG > 1.4 || (baskiGucu > 1.8 && toplamSut > 10)) golTahmin = "⚽ KRİTİK: Gol her an gelebilir, baskı tabelaya yansımak üzere!";
    else if (toplamXG > 0.7) golTahmin = "✅ POTANSİYEL: Baskı var, bitiricilik bekleniyor.";

    // 2. KORNER DURUMU
    const kornerVerimi = ((hKorner + aKorner) / (dak / 10)).toFixed(1);
    let kornerTahmin = kornerVerimi > 1.1 ? "🚀 CANLI: Kanat akınları yoğun, korner kovalanır." : "📉 DURGUN: Oyun merkezde sıkışmış.";

    // 3. KART & GERİLİM
    const toplamSari = hSari + aSari;
    let kartYorum = "🟢 Sakin: Hakem oyunu kontrol ediyor.";
    if (toplamSari > 4 || (dak < 40 && toplamSari > 2)) kartYorum = "🔴 GERGİN: Sertlik çok fazla, Kırmızı Kart veya Penaltı riski!";

    return `🛡️ *KOPRADAR VISION ANALİZ v15.0*\n\n` +
           `🕒 Dakika: ${dak || '?'}\n` +
           `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n` +
           `🥅 *GOL BEKLENTİSİ (xG):* ${toplamXG}\n` +
           `👉 ${golTahmin}\n\n` +
           `🚩 *KORNER DURUMU:*\n` +
           `👉 ${kornerTahmin}\n\n` +
           `🟨 *KART & GERİLİM:*\n` +
           `👉 ${kartYorum}\n` +
           `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n` +
           `🔥 *Baskı Yoğunluğu:* %${Math.min(100, (baskiGucu * 40)).toFixed(0)}\n` +
           `📊 *Verimlilik Skoru:* %${Math.min(100, (toplamXG * 50)).toFixed(0)}\n\n` +
           `💡 _Not: xG verisi yüksekse momentumun 'gerçek' gol getirme ihtimali %80'dir._`;
}

// ================= RESİM İŞLEME =================
bot.on('photo', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    bot.sendMessage(msg.chat.id, "🖼️ Görsel inceleniyor, veriler çıkartılıyor... (Yaklaşık 10-15 sn)");

    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileLink = await bot.getFileLink(fileId);

        // OCR ile resmi metne çevir
        const { data: { text } } = await Tesseract.recognize(fileLink, 'eng');
        
        // Sayıları ayıkla
        const sayilar = text.match(/\d+(\.\d+)?/g).map(Number);

        // Örnek resmindeki sıraya göre tahminlenen veri haritası
        const analizData = {
            dak: sayilar[0] || 0,
            hSut: sayilar[1] || 0, aSut: sayilar[2] || 0,
            hKorner: sayilar[3] || 0, aKorner: sayilar[4] || 0,
            hSari: sayilar[5] || 0, aSari: sayilar[6] || 0,
            hTehAtak: sayilar[7] || 0, aTehAtak: sayilar[8] || 0,
            hXG: sayilar[9] || 0.1, aXG: sayilar[10] || 0.1
        };

        const sonuc = detayliAnaliz(analizData);
        bot.sendMessage(msg.chat.id, sonuc, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Hata: Resim okunamadı. Lütfen istatistiklerin net göründüğünden emin olun.");
        console.error(e);
    }
});

// Bilgilendirme mesajı
bot.on('message', (msg) => {
    if (msg.photo || msg.text?.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, "🎯 Analiz için lütfen maçın istatistik panelinin ekran görüntüsünü gönderin.");
});

http.createServer((req, res) => { res.end('Vision Active'); }).listen(process.env.PORT || 8080);
