const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function analizEt(metin) {
    // Metindeki tüm sayıları ve ondalıklı sayıları (xG için) ayıkla
    const sayilar = metin.match(/\d+(\.\d+)?/g);
    
    if (!sayilar || sayilar.length < 6) {
        return "❌ Veri Ayıklanamadı! Lütfen istatistikleri kopyalayıp buraya yapıştırın.";
    }

    const d = sayilar.map(Number);
    
    // Veri Haritası (Genelde kopyalanan metin sırası: Dakika, Şutlar, Kornerler, Kartlar, xG)
    const dak = d[0];
    const hSut = d[1], aSut = d[2];
    const hKorner = d[3], aKorner = d[4];
    const hSari = d[5] || 0, aSari = d[6] || 0;
    const hXG = d[7] || 0.1, aXG = d[8] || 0.1;

    const tXG = (parseFloat(hXG) + parseFloat(aXG)).toFixed(2);
    const tSut = hSut + aSut;

    let sonuc = `🛡️ *KOPRADAR PRO ANALİZ v16.0*\n\n`;
    sonuc += `🕒 Dakika: ${dak}'\n`;
    sonuc += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

    // GOL ANALİZİ
    if (tXG > 1.2 || (tSut > 10 && dak > 60)) {
        sonuc += `🥅 *GOL:* 🔥 KRİTİK! Baskı çok yüksek, gol her an gelebilir.\n\n`;
    } else {
        sonuc += `🥅 *GOL:* ⌛ Beklemede. Pozisyonlar henüz netleşmedi.\n\n`;
    }

    // KORNER ANALİZİ
    if ((hKorner + aKorner) > (dak / 8)) {
        sonuc += `🚩 *KORNER:* 🚀 COŞKULU! Kanat akınları devam ediyor.\n\n`;
    } else {
        sonuc += `🚩 *KORNER:* 📉 Stabil. Orta saha mücadelesi hakim.\n\n`;
    }

    // KART ANALİZİ
    if ((hSari + aSari) > 3) {
        sonuc += `🟨 *KART:* 🔴 GERGİN! Maç sertleşti, kırmızı kart riski var.\n\n`;
    } else {
        sonuc += `🟨 *KART:* 🟢 Sakin oyun.\n\n`;
    }

    sonuc += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    sonuc += `📊 *Toplam xG:* ${tXG}\n`;
    sonuc += `💡 _Tavsiye: Dakika ${dak}, istatistikler ${tXG > 1 ? "Hücum" : "Savunma"} ağırlıklı._`;

    return sonuc;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;
    
    const analizMesaji = analizEt(msg.text);
    bot.sendMessage(msg.chat.id, analizMesaji, { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v16 Active'); }).listen(process.env.PORT || 8080);
