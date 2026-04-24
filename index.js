const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function analizEt(metin) {
    // Sadece sayıları ve noktaları al (xG için)
    const d = metin.trim().split(/\s+/).map(Number);
    
    if (d.length < 5) {
        return "❌ *Eksik Veri Girişi!*\n\nLütfen sayıları şu sırayla, aralarında boşluk bırakarak yazın:\n`Dakika EvŞut DepŞut EvKorner DepKorner EvKart DepKart Ev_xG Dep_xG`";
    }

    // Değişkenleri tanımlıyoruz
    const dak = d[0];
    const hSut = d[1], aSut = d[2];
    const hKorner = d[3], aKorner = d[4];
    const hKart = d[5] || 0, aKart = d[6] || 0;
    const hXG = d[7] || 0, aXG = d[8] || 0;

    const tXG = (hXG + aXG).toFixed(2);
    const tSut = hSut + aSut;

    let rapor = `🛡️ *KOPRADAR KESİN ANALİZ v17.0*\n\n`;
    rapor += `🕒 Dakika: ${dak}'\n`;
    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

    // 🥅 GOL ANALİZİ
    if (tXG > 1.2 || (tSut > 10 && dak > 60)) {
        rapor += `🥅 *GOL:* 🔥 KRİTİK! Olasılık tavan. Gol her an gelebilir.\n\n`;
    } else if (tXG > 0.6) {
        rapor += `🥅 *GOL:* ✅ POTANSİYEL. Baskı var ama bitiricilik zayıf.\n\n`;
    } else {
        rapor += `🥅 *GOL:* ⌛ BEKLEMEDE. Net pozisyon az.\n\n`;
    }

    // 🚩 KORNER ANALİZİ
    const kornerHizi = (hKorner + aKorner) / (dak / 10);
    if (kornerHizi > 1.3) {
        rapor += `🚩 *KORNER:* 🚀 COŞKULU! Kanatlar çok aktif, korner kovalanır.\n\n`;
    } else {
        rapor += `🚩 *KORNER:* 📉 STABİL. Oyun merkezde.\n\n`;
    }

    // 🟨 KART ANALİZİ
    if ((hKart + aKart) > 3) {
        rapor += `🟨 *KART:* 🔴 GERGİN! Maç sertleşti, disiplin kayboluyor.\n\n`;
    } else {
        rapor += `🟨 *KART:* 🟢 SAKİN.\n\n`;
    }

    rapor += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    rapor += `📊 *Toplam xG:* ${tXG}\n`;
    rapor += `🎯 *Şut Verimi:* %${((tXG / (tSut || 1)) * 100).toFixed(0)}\n\n`;
    rapor += `💡 _Tavsiye: Sayıları doğru girdiğiniz sürece bu analiz %100 matematiktir._`;

    return rapor;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text?.startsWith('/')) return;
    
    bot.sendMessage(msg.chat.id, analizEt(msg.text), { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v17 Active'); }).listen(process.env.PORT || 8080);
